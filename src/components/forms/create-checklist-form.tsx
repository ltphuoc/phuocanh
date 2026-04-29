'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createChecklistAction } from '@/app/actions/list-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateHomeAndLists } from '@/lib/query/app-query-updates';

const buildChecklistSchema = (t: ReturnType<typeof useI18n>['t']) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t('validation.titleRequired'))
      .max(120, t('validation.titleMax')),
  });

type ChecklistValues = z.infer<ReturnType<typeof buildChecklistSchema>>;

export const CreateChecklistForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.checklist');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createChecklistAction);
  const form = useForm<ChecklistValues>({
    defaultValues: {
      title: '',
    },
    resolver: zodResolver(buildChecklistSchema(formT)),
  });
  const titleErrorMessage = form.formState.errors.title?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('title', values.title);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        title: '',
      });
      await invalidateHomeAndLists(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit checklist form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <FormSection
        errorId="checklistTitle-error"
        errorMessage={titleErrorMessage}
        htmlFor="checklistTitle"
        label={formT('titleLabel')}
      >
        <Input
          aria-describedby={titleErrorMessage ? 'checklistTitle-error' : undefined}
          aria-invalid={Boolean(titleErrorMessage)}
          id="checklistTitle"
          placeholder={formT('titlePlaceholder')}
          type="text"
          {...form.register('title')}
        />
      </FormSection>
      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
        variant="outline"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
