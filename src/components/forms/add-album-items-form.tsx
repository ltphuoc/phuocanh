'use client';

import type { ReactElement } from 'react';

import Image from 'next/image';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { addAlbumItemsAction } from '@/app/actions/planning-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { cn } from '@/lib/utils/cn';

interface AddAlbumItemsFormProps {
  readonly albumId: string;
  readonly candidates: readonly AlbumMediaOption[];
  readonly timeZone: string;
  readonly tripId: string;
}

interface AlbumMediaOption {
  readonly happenedAt: string;
  readonly id: string;
  readonly locationName: string | null;
  readonly mediaType: 'image' | 'video';
  readonly note: string | null;
  readonly signedUrl: string | null;
}

const buildAddAlbumItemsSchema = (t: ReturnType<typeof useI18n<'forms.album'>>['t']) =>
  z.object({
    memoryMediaIds: z.array(z.uuid()).min(1, t('validation.mediaRequired')),
  });

type AddAlbumItemsValues = z.infer<ReturnType<typeof buildAddAlbumItemsSchema>>;

const renderMediaPreview = (
  candidate: AlbumMediaOption,
  fallbackLabel: string,
  videoLabel: string,
): ReactElement => {
  if (candidate.mediaType === 'image' && candidate.signedUrl) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.3rem] border border-white/70 bg-white/70 shadow-whisper">
        <Image
          alt={candidate.note?.trim() || fallbackLabel}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 768px) 24vw, 100vw"
          src={candidate.signedUrl}
          unoptimized
        />
      </div>
    );
  }

  if (candidate.mediaType === 'video' && candidate.signedUrl) {
    return (
      <video
        className="aspect-[4/3] w-full rounded-[1.3rem] border border-white/70 bg-black/80 object-cover shadow-whisper"
        muted
        playsInline
        preload="metadata"
        src={candidate.signedUrl}
      />
    );
  }

  return (
    <div className="ui-gradient-memory flex aspect-[4/3] items-end rounded-[1.3rem] border border-white/70 p-4 shadow-whisper">
      <div className="rounded-pill border border-white/65 bg-white/78 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase shadow-whisper">
        {candidate.mediaType === 'video' ? videoLabel : fallbackLabel}
      </div>
    </div>
  );
};

export const AddAlbumItemsForm = ({
  albumId,
  candidates,
  timeZone,
  tripId,
}: AddAlbumItemsFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { format, t: formT } = useI18n('forms.album');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(addAlbumItemsAction);
  const form = useForm<AddAlbumItemsValues>({
    defaultValues: {
      memoryMediaIds: [],
    },
    resolver: zodResolver(buildAddAlbumItemsSchema(formT)),
  });
  const selectedMediaIds =
    useWatch({
      control: form.control,
      name: 'memoryMediaIds',
    }) ?? [];

  const mediaErrorMessage = form.formState.errors.memoryMediaIds?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('albumId', albumId);
    values.memoryMediaIds.forEach((mediaId) => {
      payload.append('memoryMediaIds', mediaId);
    });
    payload.set('tripId', tripId);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        memoryMediaIds: [],
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: appQueryKeys.albums() }),
        queryClient.invalidateQueries({ queryKey: appQueryKeys.album(albumId) }),
        queryClient.invalidateQueries({ queryKey: appQueryKeys.trip(tripId) }),
      ]);
    } catch (error: unknown) {
      console.error('Failed to submit album items form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <FormSection
        description={formT('addMediaDescription', {
          count: selectedMediaIds.length,
        })}
        errorId="add-album-media-error"
        errorMessage={mediaErrorMessage}
        label={formT('addMediaLabel')}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const inputId = `add-album-media-${candidate.id}`;
            const isSelected = selectedMediaIds.includes(candidate.id);
            const happenedAt = parseISO(candidate.happenedAt);
            const happenedAtLabel = Number.isNaN(happenedAt.getTime())
              ? candidate.happenedAt
              : format.dateTime(happenedAt, {
                  day: 'numeric',
                  month: 'short',
                  timeZone,
                  year: 'numeric',
                });

            return (
              <label
                className="block"
                htmlFor={inputId}
                key={candidate.id}
              >
                <input
                  aria-describedby={mediaErrorMessage ? 'add-album-media-error' : undefined}
                  className="sr-only"
                  id={inputId}
                  type="checkbox"
                  value={candidate.id}
                  {...form.register('memoryMediaIds')}
                />
                <div
                  className={cn(
                    'flex h-full cursor-pointer flex-col gap-3 rounded-[1.6rem] border bg-white/72 p-4 shadow-whisper transition-all',
                    isSelected
                      ? 'border-primary shadow-cloud ring-2 ring-primary/20'
                      : 'border-white/70 hover:-translate-y-0.5 hover:shadow-cloud',
                  )}
                >
                  {renderMediaPreview(candidate, formT('mediaFallback'), formT('videoFallback'))}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="ui-meta">{happenedAtLabel}</p>
                      <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
                        {isSelected ? formT('selectedLabel') : formT('selectLabel')}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
                      {candidate.note?.trim() || formT('mediaNoteFallback')}
                    </p>
                    {candidate.locationName ? (
                      <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                        {candidate.locationName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </FormSection>

      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
      >
        {formT('addMediaSubmit')}
      </Button>
    </form>
  );
};
