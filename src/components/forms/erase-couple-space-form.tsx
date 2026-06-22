'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { eraseCoupleSpaceAction } from '@/app/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';

// Fixed, language-neutral confirmation token the user must type, mirrored by the
// eraseCoupleSpaceAction Zod literal.
const CONFIRMATION_TOKEN = 'DELETE';

export const EraseCoupleSpaceForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: dangerT } = useI18n('settings.dangerZone');
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useActionMutation(eraseCoupleSpaceAction);
  const [confirmation, setConfirmation] = useState('');

  const isConfirmed = confirmation === CONFIRMATION_TOKEN;

  const onErase = async (): Promise<void> => {
    const payload = new FormData();
    payload.set('confirmation', confirmation);

    try {
      const nextState = await mutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      // The couple and all its cached queries are gone; clear the client cache and send
      // the now-couple-less (still authenticated) user back to onboarding to re-bootstrap.
      queryClient.clear();
      router.replace('/onboarding');
    } catch (error: unknown) {
      console.error('Failed to erase couple space', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

  return (
    <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-panel border p-4">
      <p className="text-sm text-foreground">{dangerT('warning')}</p>
      <label className="flex flex-col gap-1 text-sm text-foreground">
        <span>{dangerT('confirmLabel', { token: CONFIRMATION_TOKEN })}</span>
        <Input
          aria-label={dangerT('confirmLabel', { token: CONFIRMATION_TOKEN })}
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={CONFIRMATION_TOKEN}
          spellCheck={false}
          value={confirmation}
        />
      </label>
      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        disabled={!isConfirmed}
        isBusy={mutation.isPending}
        onClick={() => void onErase()}
        type="button"
        variant="outline"
      >
        {dangerT('submit')}
      </Button>
    </div>
  );
};
