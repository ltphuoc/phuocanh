"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { createMemoryAction } from "@/app/actions/memory-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/actions/action-state";

const createMemorySchema = z.object({
  happenedAtLocal: z.string().min(1),
  locationName: z.string().max(180).optional(),
  note: z.string().max(800).optional(),
});

type CreateMemoryValues = z.infer<typeof createMemorySchema>;

export const CreateMemoryForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.memory");
  const router = useRouter();
  const [state, submitAction, isPending] = useActionState(
    createMemoryAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const form = useForm<CreateMemoryValues>({
    defaultValues: {
      happenedAtLocal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      locationName: "",
      note: "",
    },
    resolver: zodResolver(createMemorySchema),
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
    payload.set("happenedAt", new Date(values.happenedAtLocal).toISOString());
    payload.set("locationName", values.locationName ?? "");
    payload.set("note", values.note ?? "");

    if (mediaFile) {
      payload.set("media", mediaFile);
    }

    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          description={formT("happenedAtDescription")}
          htmlFor="happenedAtLocal"
          label={formT("happenedAtLabel")}
        >
          <Input
            id="happenedAtLocal"
            type="datetime-local"
            {...form.register("happenedAtLocal")}
          />
        </FormSection>

        <FormSection
          description={formT("locationDescription")}
          htmlFor="locationName"
          label={formT("locationLabel")}
        >
          <Input
            id="locationName"
            placeholder={formT("locationPlaceholder")}
            type="text"
            {...form.register("locationName")}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT("noteDescription")}
        htmlFor="note"
        label={formT("noteLabel")}
      >
        <Textarea
          id="note"
          placeholder={formT("notePlaceholder")}
          rows={5}
          {...form.register("note")}
        />
      </FormSection>

      <FormSection
        description={formT("mediaDescription")}
        htmlFor="media"
        label={formT("mediaLabel")}
      >
        <Input
          id="media"
          onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </FormSection>

      <Button
        busyLabel={commonT("working")}
        className="w-full md:w-auto"
        isBusy={isPending}
        type="submit"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
