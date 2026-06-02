'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { addChecklistItemAction } from '@/app/actions/list-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateHomeAndLists } from '@/lib/query/app-query-updates';

const buildChecklistItemSchema = (t: ReturnType<typeof useI18n>['t']) =>
  z.object({
    text: z.string().trim().min(1, t('validation.textRequired')).max(180, t('validation.textMax')),
  });

type ChecklistItemValues = z.infer<ReturnType<typeof buildChecklistItemSchema>>;

interface ChecklistItemFormProps {
  readonly checklistId: string;
}

export const ChecklistItemForm = ({ checklistId }: ChecklistItemFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.checklistItem');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(addChecklistItemAction);
  const form = useForm<ChecklistItemValues>({
    defaultValues: {
      text: '',
    },
    resolver: zodResolver(buildChecklistItemSchema(formT)),
  });
  const textErrorMessage = form.formState.errors.text?.message;
  const inputId = `checklist-item-${checklistId}`;
  const errorId = `${inputId}-error`;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('checklistId', checklistId);
    payload.set('text', values.text);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        text: '',
      });
      await invalidateHomeAndLists(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit checklist item form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row"
      onSubmit={onSubmit}
    >
      <div className="min-w-0 flex-1">
        <label
          className="sr-only"
          htmlFor={inputId}
        >
          {formT('label')}
        </label>
        <Input
          aria-describedby={textErrorMessage ? errorId : undefined}
          aria-invalid={Boolean(textErrorMessage)}
          aria-required
          id={inputId}
          placeholder={formT('placeholder')}
          type="text"
          {...form.register('text')}
        />
        {textErrorMessage ? (
          <p
            className="mt-2 text-sm font-medium text-error"
            id={errorId}
            role="alert"
          >
            {textErrorMessage}
          </p>
        ) : null}
      </div>
      <Button
        busyLabel={commonT('working')}
        className="shrink-0 sm:w-auto"
        isBusy={mutation.isPending}
        size="sm"
        type="submit"
        variant="outline"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
