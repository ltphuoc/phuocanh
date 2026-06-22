'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useI18n } from '@/hooks/useI18n';
import {
  isAllowedMediaMimeType,
  isDeniedMediaMimeType,
  MAX_UPLOAD_BYTES,
} from '@/lib/media/memory-media-validation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MEMORY_MEDIA_BUCKET = 'memory-media';

export interface TrackedUpload {
  readonly id: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly originalFileName: string;
  readonly sizeBytes: number;
}

const sanitizeFileName = (fileName: string): string =>
  fileName.replaceAll(/[^a-zA-Z0-9.\-_]/g, '_');

const buildStoragePath = (coupleId: string, memoryId: string, fileName: string): string => {
  const safeName = sanitizeFileName(fileName || 'upload');

  return `couples/${coupleId}/memories/${memoryId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
};

export interface UseMemoryMediaUploadsResult {
  readonly uploads: readonly TrackedUpload[];
  readonly isUploading: boolean;
  // Validates and uploads each file immediately; invalid files are rejected with
  // a toast and never reach storage.
  readonly addFiles: (files: File[]) => Promise<void>;
  // Removes a single uploaded-but-unsubmitted object and drops it from tracking.
  readonly removeUpload: (id: string) => Promise<void>;
  // Drops tracking WITHOUT deleting storage objects (ownership transferred to the
  // created memory on a successful submit).
  readonly clearTracking: () => void;
  // Deletes every tracked object and drops tracking (failed submit).
  readonly cleanupAll: () => Promise<void>;
}

// Owns the lifecycle of memory-media objects that are uploaded as soon as the user
// picks them, before the memory exists. Cleans them up on deselect, on a failed
// submit, and best-effort on unmount, so abandoned picks do not orphan storage
// objects. On a successful submit the form transfers ownership via clearTracking().
export const useMemoryMediaUploads = (
  coupleId: string,
  memoryId: string,
): UseMemoryMediaUploadsResult => {
  const { t: actionsT } = useI18n('actions');
  const [supabase] = useState(createSupabaseBrowserClient);
  const [uploads, setUploads] = useState<TrackedUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // Mirror of the storage paths still owned by the form, readable from the
  // unmount effect (which cannot observe the latest `uploads` state).
  const pendingPathsRef = useRef<Set<string>>(new Set());

  const removeStorageObject = useCallback(
    async (storagePath: string): Promise<void> => {
      pendingPathsRef.current.delete(storagePath);
      const { error } = await supabase.storage.from(MEMORY_MEDIA_BUCKET).remove([storagePath]);
      if (error) {
        console.error('Failed to clean up uploaded memory media', error);
      }
    },
    [supabase],
  );

  const addFiles = useCallback(
    async (files: File[]): Promise<void> => {
      if (!files.length) {
        return;
      }

      setIsUploading(true);
      try {
        for (const file of files) {
          if (file.size > MAX_UPLOAD_BYTES) {
            toast.error(actionsT('memory.fileTooLarge'));
            continue;
          }

          if (isDeniedMediaMimeType(file.type)) {
            toast.error(actionsT('memory.svgNotAllowed'));
            continue;
          }

          if (!isAllowedMediaMimeType(file.type)) {
            toast.error(actionsT('memory.unsupportedType'));
            continue;
          }

          const storagePath = buildStoragePath(coupleId, memoryId, file.name);
          const { error } = await supabase.storage
            .from(MEMORY_MEDIA_BUCKET)
            .upload(storagePath, file, { cacheControl: '3600', upsert: false });

          if (error) {
            console.error('Failed to upload memory media', error);
            toast.error(actionsT('unexpectedError'));
            continue;
          }

          pendingPathsRef.current.add(storagePath);
          setUploads((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              storagePath,
              mimeType: file.type,
              originalFileName: file.name,
              sizeBytes: file.size,
            },
          ]);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [actionsT, coupleId, memoryId, supabase],
  );

  const removeUpload = useCallback(
    async (id: string): Promise<void> => {
      const target = uploads.find((upload) => upload.id === id);
      if (!target) {
        return;
      }

      setUploads((current) => current.filter((upload) => upload.id !== id));
      await removeStorageObject(target.storagePath);
    },
    [removeStorageObject, uploads],
  );

  const clearTracking = useCallback((): void => {
    pendingPathsRef.current.clear();
    setUploads([]);
  }, []);

  const cleanupAll = useCallback(async (): Promise<void> => {
    const storagePaths = [...pendingPathsRef.current];
    pendingPathsRef.current.clear();
    setUploads([]);
    await Promise.all(storagePaths.map((storagePath) => removeStorageObject(storagePath)));
  }, [removeStorageObject]);

  useEffect(
    () => () => {
      // Best-effort cleanup of uploaded-but-unsubmitted objects on unmount /
      // navigation. Async removal may not flush on a hard tab close, so this
      // reduces leaks rather than guaranteeing their absence (a server-side sweep
      // is intentionally out of scope).
      for (const storagePath of pendingPathsRef.current) {
        void supabase.storage.from(MEMORY_MEDIA_BUCKET).remove([storagePath]);
      }
      pendingPathsRef.current.clear();
    },
    [supabase],
  );

  return { uploads, isUploading, addFiles, removeUpload, clearTracking, cleanupAll };
};
