'use client';

import type { ReactElement } from 'react';
import type { TriviaAppData } from '@/lib/app-data/types';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitTriviaAnswerAction } from '@/app/actions/gameplay-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { invalidateTrivia } from '@/lib/query/app-query-updates';
import { cn } from '@/lib/utils/cn';

const buildSubmitTriviaAnswerSchema = (t: ReturnType<typeof useI18n<'forms.trivia'>>['t']) =>
  z.object({
    roundId: z.uuid(),
    selectedAnswer: z.string().trim().min(1, t('validation.answerRequired')),
  });

type SubmitTriviaAnswerValues = z.infer<ReturnType<typeof buildSubmitTriviaAnswerSchema>>;

interface SubmitTriviaAnswerFormProps {
  readonly options: readonly string[];
  readonly roundId: string;
}

export const SubmitTriviaAnswerForm = ({
  options,
  roundId,
}: SubmitTriviaAnswerFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.trivia');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(submitTriviaAnswerAction);
  const form = useForm<SubmitTriviaAnswerValues>({
    defaultValues: {
      roundId,
      selectedAnswer: '',
    },
    resolver: zodResolver(buildSubmitTriviaAnswerSchema(formT)),
  });

  const selectedAnswer = useWatch({
    control: form.control,
    name: 'selectedAnswer',
  });
  const selectedAnswerErrorMessage = form.formState.errors.selectedAnswer?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('roundId', values.roundId);
    payload.set('selectedAnswer', values.selectedAnswer);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        roundId,
        selectedAnswer: '',
      });
      queryClient.setQueryData<TriviaAppData>(appQueryKeys.trivia(), (current) => {
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
              nextAnswerCount >= current.round.activePartnerCount
                ? 'completed'
                : 'waiting_for_partner',
            viewerHasAnswered: true,
          },
        };
      });
      void invalidateTrivia(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit trivia answer', error);
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
        errorId="trivia-answer-error"
        errorMessage={selectedAnswerErrorMessage}
        label={formT('answerLabel')}
      >
        <div
          aria-describedby={selectedAnswerErrorMessage ? 'trivia-answer-error' : undefined}
          aria-invalid={Boolean(selectedAnswerErrorMessage)}
          aria-label={formT('answerLabel')}
          className="grid gap-3"
          role="radiogroup"
        >
          {options.map((option) => (
            <label
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
                selectedAnswer === option
                  ? 'border-primary/35 bg-primary/12 text-foreground'
                  : 'border-white/70 bg-white/66 text-muted-foreground hover:bg-white/86',
              )}
              key={option}
            >
              <input
                className="size-4 accent-primary"
                type="radio"
                value={option}
                {...form.register('selectedAnswer')}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
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
