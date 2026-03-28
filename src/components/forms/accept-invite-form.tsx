"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { acceptInviteAction } from "@/app/actions/auth-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const acceptInviteSchema = z.object({
  token: z.uuid(),
});

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

interface AcceptInviteFormProps {
  readonly initialToken: string;
}

export const AcceptInviteForm = ({
  initialToken,
}: AcceptInviteFormProps): ReactElement => {
  const [state, submitAction, isPending] = useActionState(
    acceptInviteAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<AcceptInviteValues>({
    defaultValues: {
      token: initialToken,
    },
    resolver: zodResolver(acceptInviteSchema),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    if (state.status === "success") {
      toast.success(state.message);
      window.location.assign("/home");
      return;
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [hasSubmitted, state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("token", values.token);
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection
        description="Token is prefilled from your partner invite URL."
        htmlFor="inviteToken"
        label="Invite token"
      >
        <Input id="inviteToken" readOnly type="text" {...form.register("token")} />
      </FormSection>
      <Button className="w-full" isBusy={isPending} type="submit">
        Join couple space
      </Button>
    </form>
  );
};
