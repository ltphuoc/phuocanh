'use client';

import type { ReactElement } from 'react';
import type { DailyQuestionAppData } from '@/lib/app-data/types';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitDailyQuestionAnswerAction } from '@/app/actions/gameplay-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { invalidateGameplay } from '@/lib/query/app-query-updates';

const buildSubmitDailyQuestionAnswerSchema = (
  t: ReturnType<typeof useI18n<'forms.dailyQuestion'>>['t'],
) =>
  z.object({
    answerBody: z
      .string()
      .trim()
      .min(1, t('validation.answerRequired'))
      .max(800, t('validation.answerMax')),
    roundId: z.uuid(),
  });

type SubmitDailyQuestionAnswerValues = z.infer<
  ReturnType<typeof buildSubmitDailyQuestionAnswerSchema>
>;

interface SubmitDailyQuestionAnswerFormProps {
  readonly roundId: string;
}

export const SubmitDailyQuestionAnswerForm = ({
  roundId,
}: SubmitDailyQuestionAnswerFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.dailyQuestion');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(submitDailyQuestionAnswerAction);
  const form = useForm<SubmitDailyQuestionAnswerValues>({
    defaultValues: {
      answerBody: '',
      roundId,
    },
    resolver: zodResolver(buildSubmitDailyQuestionAnswerSchema(formT)),
  });

  const answerErrorMessage = form.formState.errors.answerBody?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('answerBody', values.answerBody);
    payload.set('roundId', values.roundId);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        answerBody: '',
        roundId,
      });
      queryClient.setQueryData<DailyQuestionAppData>(appQueryKeys.dailyQuestion(), (current) => {
        if (!current?.round || current.round.id !== roundId) {
          return current;
        }

        const isFirstAnswer = current.round.answerCount === 0;

        return {
          ...current,
          round: {
            ...current.round,
            answerCount: isFirstAnswer ? 1 : current.round.answerCount,
            status: isFirstAnswer ? 'waiting_for_partner' : current.round.status,
            viewerHasAnswered: true,
          },
        };
      });
      void invalidateGameplay(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit daily question answer', error);
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
        description={formT('answerDescription')}
        errorId="daily-question-answer-error"
        errorMessage={answerErrorMessage}
        htmlFor="dailyQuestionAnswer"
        label={formT('answerLabel')}
      >
        <Textarea
          aria-describedby={answerErrorMessage ? 'daily-question-answer-error' : undefined}
          aria-invalid={Boolean(answerErrorMessage)}
          id="dailyQuestionAnswer"
          placeholder={formT('answerPlaceholder')}
          rows={6}
          {...form.register('answerBody')}
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
