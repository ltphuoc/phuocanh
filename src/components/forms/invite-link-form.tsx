'use client';

import type { ReactElement } from 'react';
import type { ActionStateWithData } from '@/lib/actions/action-state';

import { startTransition, useActionState, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { createInviteAction } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { initialActionState } from '@/lib/actions/action-state';

interface InviteData {
  readonly inviteUrl: string;
}

const initialInviteState: ActionStateWithData<InviteData> = {
  ...initialActionState,
  data: undefined,
};

export const InviteLinkForm = (): ReactElement => {
  const { locale } = useI18n();
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.invite');
  const [state, submitAction, isPending] = useActionState(createInviteAction, initialInviteState);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const actionMessageKey = state.message || 'unexpectedError';

    if (state.status === 'success' && state.data?.inviteUrl) {
      toast.success(actionsT(actionMessageKey));
    }

    if (state.status === 'error') {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, state.data?.inviteUrl, state.message, state.status]);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            const payload = new FormData();
            payload.set('locale', locale);
            payload.set('email', email);
            submitAction(payload);
          });
        }}
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-semibold text-foreground"
            htmlFor="invite-email"
          >
            {formT('emailLabel')}
          </label>
          <Input
            autoComplete="off"
            id="invite-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={formT('emailPlaceholder')}
            required
            type="email"
            value={email}
          />
          <p className="text-xs text-muted-foreground">{formT('emailHint')}</p>
        </div>
        <Button
          busyLabel={commonT('working')}
          className="w-full md:w-auto"
          isBusy={isPending}
          type="submit"
          variant="outline"
        >
          {formT('submit')}
        </Button>
      </form>
      {state.data?.inviteUrl ? (
        <div
          aria-live="polite"
          className="flex flex-col gap-2"
        >
          <p className="text-xs font-semibold text-muted-foreground">{formT('readyStatus')}</p>
          <button
            aria-label={formT('copyLabel')}
            className="min-h-11 rounded-control border border-white/72 bg-white/78 px-3 py-2 text-left text-xs break-all text-muted-foreground shadow-whisper transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/92 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            onClick={async () => {
              await navigator.clipboard.writeText(state.data?.inviteUrl ?? '');
              toast.success(formT('copySuccess'));
            }}
            type="button"
          >
            {state.data.inviteUrl}
          </button>
        </div>
      ) : null}
    </div>
  );
};
