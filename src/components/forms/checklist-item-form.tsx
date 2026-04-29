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

const checklistItemSchema = z.object({
  text: z.string().min(1).max(180),
});

type ChecklistItemValues = z.infer<typeof checklistItemSchema>;

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
    resolver: zodResolver(checklistItemSchema),
  });

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
      <Input
        placeholder={formT('placeholder')}
        type="text"
        {...form.register('text')}
      />
      <Button
        busyLabel={commonT('working')}
        className="sm:w-auto"
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
