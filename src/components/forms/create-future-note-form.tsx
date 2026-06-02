'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createFutureNoteAction } from '@/app/actions/planning-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { formatDateInputValue } from '@/lib/utils/date-input';

const buildCreateFutureNoteSchema = (t: ReturnType<typeof useI18n<'forms.futureNote'>>['t']) =>
  z.object({
    body: z.string().trim().min(1, t('validation.bodyRequired')).max(2000, t('validation.bodyMax')),
    title: z
      .string()
      .trim()
      .min(1, t('validation.titleRequired'))
      .max(120, t('validation.titleMax')),
    unlockDate: z.string().min(1, t('validation.unlockDateRequired')),
  });

type CreateFutureNoteValues = z.infer<ReturnType<typeof buildCreateFutureNoteSchema>>;

export const CreateFutureNoteForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.futureNote');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createFutureNoteAction);
  const form = useForm<CreateFutureNoteValues>({
    defaultValues: {
      body: '',
      title: '',
      unlockDate: formatDateInputValue(addDays(new Date(), 30)),
    },
    resolver: zodResolver(buildCreateFutureNoteSchema(formT)),
  });

  const bodyErrorMessage = form.formState.errors.body?.message;
  const titleErrorMessage = form.formState.errors.title?.message;
  const unlockDateErrorMessage = form.formState.errors.unlockDate?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('body', values.body);
    payload.set('title', values.title);
    payload.set('unlockDate', values.unlockDate);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        body: '',
        title: '',
        unlockDate: formatDateInputValue(addDays(new Date(), 30)),
      });
      await queryClient.invalidateQueries({ queryKey: appQueryKeys.futureNotes() });
    } catch (error: unknown) {
      console.error('Failed to submit future note form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          errorId="future-note-title-error"
          errorMessage={titleErrorMessage}
          htmlFor="futureNoteTitle"
          label={formT('titleLabel')}
          required
        >
          <Input
            aria-describedby={titleErrorMessage ? 'future-note-title-error' : undefined}
            aria-invalid={Boolean(titleErrorMessage)}
            aria-required
            id="futureNoteTitle"
            placeholder={formT('titlePlaceholder')}
            type="text"
            {...form.register('title')}
          />
        </FormSection>

        <FormSection
          description={formT('unlockDateDescription')}
          errorId="future-note-unlock-date-error"
          errorMessage={unlockDateErrorMessage}
          htmlFor="futureNoteUnlockDate"
          label={formT('unlockDateLabel')}
          required
        >
          <Input
            aria-describedby={unlockDateErrorMessage ? 'future-note-unlock-date-error' : undefined}
            aria-invalid={Boolean(unlockDateErrorMessage)}
            aria-required
            id="futureNoteUnlockDate"
            type="date"
            {...form.register('unlockDate')}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT('bodyDescription')}
        errorId="future-note-body-error"
        errorMessage={bodyErrorMessage}
        htmlFor="futureNoteBody"
        label={formT('bodyLabel')}
        required
      >
        <Textarea
          aria-describedby={bodyErrorMessage ? 'future-note-body-error' : undefined}
          aria-invalid={Boolean(bodyErrorMessage)}
          aria-required
          id="futureNoteBody"
          placeholder={formT('bodyPlaceholder')}
          rows={6}
          {...form.register('body')}
        />
      </FormSection>

      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
