'use client';

import type { FormEvent, ReactElement } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureTriviaRoundAction } from '@/app/actions/gameplay-actions';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateTrivia } from '@/lib/query/app-query-updates';

export const GenerateTriviaRoundForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: triviaT } = useI18n('trivia');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(ensureTriviaRoundAction);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const nextState = await mutation.mutateAsync(new FormData());
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      await invalidateTrivia(queryClient);
    } catch (error: unknown) {
      console.error('Failed to generate trivia round', error);
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
        {triviaT('intro.generateCta')}
      </Button>
    </form>
  );
};
