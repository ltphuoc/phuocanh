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
          description="Use local time for this memory."
          htmlFor="happenedAtLocal"
          label="Happened at"
        >
          <Input
            id="happenedAtLocal"
            type="datetime-local"
            {...form.register("happenedAtLocal")}
          />
        </FormSection>

        <FormSection
          description="Optional place where this happened."
          htmlFor="locationName"
          label="Location"
        >
          <Input
            id="locationName"
            placeholder="Da Nang"
            type="text"
            {...form.register("locationName")}
          />
        </FormSection>
      </div>

      <FormSection
        description="A short story helps future search and recap."
        htmlFor="note"
        label="Note"
      >
        <Textarea id="note" placeholder="What happened?" rows={5} {...form.register("note")} />
      </FormSection>

      <FormSection description="Image or video up to 25MB." htmlFor="media" label="Media">
        <Input
          id="media"
          onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </FormSection>

      <Button className="w-full md:w-auto" isBusy={isPending} type="submit">
        Save memory
      </Button>
    </form>
  );
};
