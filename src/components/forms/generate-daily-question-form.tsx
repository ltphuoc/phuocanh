'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ensureDailyQuestionRoundAction } from '@/app/actions/gameplay-actions';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { routing } from '@/i18n/routing';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateGameplay } from '@/lib/query/app-query-updates';

const buildGenerateDailyQuestionSchema = () =>
  z.object({
    locale: z.enum(routing.locales),
  });

type GenerateDailyQuestionValues = z.infer<ReturnType<typeof buildGenerateDailyQuestionSchema>>;

export const GenerateDailyQuestionForm = (): ReactElement => {
  const { locale, t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: dailyQuestionT } = useI18n('dailyQuestion');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(ensureDailyQuestionRoundAction);
  const form = useForm<GenerateDailyQuestionValues>({
    defaultValues: {
      locale,
    },
    resolver: zodResolver(buildGenerateDailyQuestionSchema()),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('locale', values.locale);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      await invalidateGameplay(queryClient);
    } catch (error: unknown) {
      console.error('Failed to generate daily question round', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <input
        type="hidden"
        {...form.register('locale')}
      />
      <Button
        busyLabel={commonT('working')}
        isBusy={mutation.isPending}
        type="submit"
      >
        {dailyQuestionT('intro.generateCta')}
      </Button>
    </form>
  );
};
