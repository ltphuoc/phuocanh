"use client";

import { startTransition, useActionState, useEffect, type ReactElement } from "react";
import { toast } from "sonner";
import { createInviteAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import {
  initialActionState,
  type ActionStateWithData,
} from "@/lib/actions/action-state";

interface InviteData {
  readonly inviteUrl: string;
}

const initialInviteState: ActionStateWithData<InviteData> = {
  ...initialActionState,
  data: undefined,
};

export const InviteLinkForm = (): ReactElement => {
  const [state, submitAction, isPending] = useActionState(
    createInviteAction,
    initialInviteState,
  );

  useEffect(() => {
    if (state.status === "success" && state.data?.inviteUrl) {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state.data?.inviteUrl, state.message, state.status]);

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            submitAction(new FormData());
          });
        }}
      >
        <Button className="w-full md:w-auto" isBusy={isPending} type="submit" variant="outline">
          Generate partner invite
        </Button>
      </form>
      {state.data?.inviteUrl ? (
        <button
          className="rounded-2xl border border-border bg-muted-soft px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          onClick={async () => {
            await navigator.clipboard.writeText(state.data?.inviteUrl ?? "");
            toast.success("Invite link copied.");
          }}
          type="button"
        >
          {state.data.inviteUrl}
        </button>
      ) : null}
    </div>
  );
};
