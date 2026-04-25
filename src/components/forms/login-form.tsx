"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { sendMagicLinkAction } from "@/app/actions/auth-actions";
import { useI18n } from "@/hooks/useI18n";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const loginSchema = z.object({
  email: z.email(),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  readonly initialNextPath?: string;
}

export const LoginForm = ({
  initialNextPath,
}: LoginFormProps): ReactElement => {
  const { locale } = useI18n();
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.login");
  const [state, submitAction, isPending] = useActionState(
    sendMagicLinkAction,
    initialActionState,
  );
  const form = useForm<LoginValues>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = new FormData();
    payload.set("email", values.email);
    payload.set("locale", locale);
    payload.set("origin", window.location.origin);
    if (initialNextPath) {
      payload.set("next", initialNextPath);
    }
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {initialNextPath ? <input name="next" type="hidden" value={initialNextPath} /> : null}
      <FormSection
        description={formT("emailDescription")}
        htmlFor="email"
        label={formT("emailLabel")}
      >
        <Input
          autoComplete="email"
          id="email"
          placeholder={formT("emailPlaceholder")}
          type="email"
          {...form.register("email")}
        />
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
