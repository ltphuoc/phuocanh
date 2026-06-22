// Shared, pure media + note validation rules for memories. Imported by the create/edit
// memory Server Actions, the edit form, and the client upload hook so the SVG denial and
// the size / note caps are defined ONCE and can never drift between client and server.

export const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;

// Active SVG markup is denied as defense-in-depth hygiene. App media renders through <img>,
// which does not execute SVG scripts, but we still refuse to STORE active markup as a media
// type. image/svg is the legacy alias some pickers emit.
export const DENIED_MEDIA_MIME_TYPES: readonly string[] = ['image/svg+xml', 'image/svg'];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Memory note cap. Mirrors the public.memories note CHECK (4000) so the app rejects an
// over-long note inline instead of surfacing a raw database error from a direct write.
export const MEMORY_NOTE_MAX_LENGTH = 4000;

const normalizeMimeType = (mimeType: string): string => mimeType.trim().toLowerCase();

export const isDeniedMediaMimeType = (mimeType: string): boolean =>
  DENIED_MEDIA_MIME_TYPES.includes(normalizeMimeType(mimeType));

export const isAllowedMediaMimeType = (mimeType: string): boolean => {
  const normalized = normalizeMimeType(mimeType);
  if (isDeniedMediaMimeType(normalized)) {
    return false;
  }

  return ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};
