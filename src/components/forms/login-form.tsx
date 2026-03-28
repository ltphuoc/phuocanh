"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { sendMagicLinkAction } from "@/app/actions/auth-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const loginSchema = z.object({
  email: z.email(),
});

type LoginValues = z.infer<typeof loginSchema>;

export const LoginForm = (): ReactElement => {
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
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = new FormData();
    payload.set("email", values.email);
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection
        description="Use the email linked to your couple space."
        htmlFor="email"
        label="Email"
      >
        <Input
          autoComplete="email"
          id="email"
          placeholder="you@example.com"
          type="email"
          {...form.register("email")}
        />
      </FormSection>
      <Button className="w-full" isBusy={isPending} type="submit">
        Send magic link
      </Button>
    </form>
  );
};
