'use client';

import type { FormEvent, ReactElement } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureGuessDateRoundAction } from '@/app/actions/gameplay-actions';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateGuessDate } from '@/lib/query/app-query-updates';

export const GenerateGuessDateRoundForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: guessDateT } = useI18n('guessDate');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(ensureGuessDateRoundAction);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const nextState = await mutation.mutateAsync(new FormData());
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      await invalidateGuessDate(queryClient);
    } catch (error: unknown) {
      console.error('Failed to generate guess date round', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Button
        busyLabel={commonT('working')}
        isBusy={mutation.isPending}
        type="submit"
      >
        {guessDateT('intro.generateCta')}
      </Button>
    </form>
  );
};
