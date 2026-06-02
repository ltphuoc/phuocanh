'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { acceptInviteAction } from '@/app/actions/auth-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';

const acceptInviteSchema = z.object({
  token: z.uuid(),
});

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

interface AcceptInviteFormProps {
  readonly initialToken: string;
}

export const AcceptInviteForm = ({ initialToken }: AcceptInviteFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.acceptInvite');
  const router = useRouter();
  const mutation = useActionMutation(acceptInviteAction);
  const form = useForm<AcceptInviteValues>({
    defaultValues: {
      token: initialToken,
    },
    resolver: zodResolver(acceptInviteSchema),
  });

  const tokenErrorMessage = form.formState.errors.token?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('token', values.token);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Failed to accept invite', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <FormSection
        description={formT('tokenDescription')}
        errorId="invite-token-error"
        errorMessage={tokenErrorMessage}
        htmlFor="inviteToken"
        label={formT('tokenLabel')}
        required
      >
        <Input
          aria-describedby={tokenErrorMessage ? 'invite-token-error' : undefined}
          aria-invalid={Boolean(tokenErrorMessage)}
          aria-required
          id="inviteToken"
          readOnly
          type="text"
          {...form.register('token')}
        />
      </FormSection>
      <Button
        busyLabel={commonT('working')}
        className="w-full"
        isBusy={mutation.isPending}
        type="submit"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
