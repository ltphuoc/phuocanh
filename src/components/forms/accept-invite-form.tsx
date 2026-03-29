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
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "@/i18n/navigation";
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
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.acceptInvite");
  const router = useRouter();
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

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      router.replace("/home");
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, hasSubmitted, router, state.message, state.status]);

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
        description={formT("tokenDescription")}
        htmlFor="inviteToken"
        label={formT("tokenLabel")}
      >
        <Input id="inviteToken" readOnly type="text" {...form.register("token")} />
      </FormSection>
      <Button
        busyLabel={commonT("working")}
        className="w-full"
        isBusy={isPending}
        type="submit"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
