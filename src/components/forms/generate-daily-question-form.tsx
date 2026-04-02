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
import { ensureDailyQuestionRoundAction } from "@/app/actions/gameplay-actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { routing } from "@/i18n/routing";
import { initialActionState } from "@/lib/actions/action-state";

const buildGenerateDailyQuestionSchema = () =>
  z.object({
    locale: z.enum(routing.locales),
  });

type GenerateDailyQuestionValues = z.infer<
  ReturnType<typeof buildGenerateDailyQuestionSchema>
>;

export const GenerateDailyQuestionForm = (): ReactElement => {
  const { locale, t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: dailyQuestionT } = useI18n("dailyQuestion");
  const [state, submitAction, isPending] = useActionState(
    ensureDailyQuestionRoundAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<GenerateDailyQuestionValues>({
    defaultValues: {
      locale,
    },
    resolver: zodResolver(buildGenerateDailyQuestionSchema()),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";
    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, hasSubmitted, state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("locale", values.locale);

    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" {...form.register("locale")} />
      <Button busyLabel={commonT("working")} isBusy={isPending} type="submit">
        {dailyQuestionT("intro.generateCta")}
      </Button>
    </form>
  );
};
