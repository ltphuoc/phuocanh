'use client';

import type { ReactElement } from 'react';
import type { GuessDateAppData } from '@/lib/app-data/types';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitGuessDateAnswerAction } from '@/app/actions/gameplay-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { invalidateGuessDate } from '@/lib/query/app-query-updates';

const buildSubmitGuessDateAnswerSchema = (t: ReturnType<typeof useI18n<'forms.guessDate'>>['t']) =>
  z.object({
    guessedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.guessedDateRequired')),
    roundId: z.uuid(),
  });

type SubmitGuessDateAnswerValues = z.infer<ReturnType<typeof buildSubmitGuessDateAnswerSchema>>;

interface SubmitGuessDateAnswerFormProps {
  readonly roundId: string;
}

export const SubmitGuessDateAnswerForm = ({
  roundId,
}: SubmitGuessDateAnswerFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.guessDate');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(submitGuessDateAnswerAction);
  const form = useForm<SubmitGuessDateAnswerValues>({
    defaultValues: {
      guessedDate: '',
      roundId,
    },
    resolver: zodResolver(buildSubmitGuessDateAnswerSchema(formT)),
  });

  const guessedDateErrorMessage = form.formState.errors.guessedDate?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('guessedDate', values.guessedDate);
    payload.set('roundId', values.roundId);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        guessedDate: '',
        roundId,
      });
      queryClient.setQueryData<GuessDateAppData>(appQueryKeys.guessDate(), (current) => {
        if (!current?.round || current.round.id !== roundId) {
          return current;
        }

        const nextAnswerCount = Math.min(
          Math.max(current.round.activePartnerCount, 1),
          current.round.answerCount + 1,
        );

        return {
          ...current,
          round: {
            ...current.round,
            answerCount: nextAnswerCount,
            status:
              current.round.activePartnerCount >= 2 &&
              nextAnswerCount >= current.round.activePartnerCount
                ? 'completed'
                : 'waiting_for_partner',
            viewerHasAnswered: true,
          },
        };
      });
      void invalidateGuessDate(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit guess date answer', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <input
        type="hidden"
        {...form.register('roundId')}
      />
      <FormSection
        description={formT('guessedDateDescription')}
        errorId="guess-date-answer-error"
        errorMessage={guessedDateErrorMessage}
        htmlFor="guessDateAnswer"
        label={formT('guessedDateLabel')}
        required
      >
        <Input
          aria-describedby={guessedDateErrorMessage ? 'guess-date-answer-error' : undefined}
          aria-invalid={Boolean(guessedDateErrorMessage)}
          aria-required
          id="guessDateAnswer"
          type="date"
          {...form.register('guessedDate')}
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
