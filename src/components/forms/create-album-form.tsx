"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import Image from "next/image";
import type { ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createAlbumAction } from "@/app/actions/planning-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import {
  getActionErrorMessage,
  useActionMutation,
} from "@/lib/query/action-mutation";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { cn } from "@/lib/utils/cn";

interface CreateAlbumFormProps {
  readonly candidates: readonly AlbumMediaOption[];
  readonly timeZone: string;
  readonly tripId: string;
}

interface AlbumMediaOption {
  readonly happenedAt: string;
  readonly id: string;
  readonly locationName: string | null;
  readonly mediaType: "image" | "video";
  readonly note: string | null;
  readonly signedUrl: string | null;
}

const buildCreateAlbumSchema = (t: ReturnType<typeof useI18n<"forms.album">>["t"]) =>
  z.object({
    description: z.string().trim().max(800, t("validation.descriptionMax")).optional(),
    memoryMediaIds: z.array(z.uuid()).min(1, t("validation.mediaRequired")),
    title: z
      .string()
      .trim()
      .min(1, t("validation.titleRequired"))
      .max(120, t("validation.titleMax")),
  });

type CreateAlbumValues = z.infer<ReturnType<typeof buildCreateAlbumSchema>>;

const renderMediaPreview = (
  candidate: AlbumMediaOption,
  fallbackLabel: string,
  videoLabel: string,
): ReactElement => {
  if (candidate.mediaType === "image" && candidate.signedUrl) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.3rem] border border-white/70 bg-white/70 shadow-whisper">
        <Image
          alt={candidate.note?.trim() || fallbackLabel}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 768px) 24vw, 100vw"
          src={candidate.signedUrl}
          unoptimized
        />
      </div>
    );
  }

  if (candidate.mediaType === "video" && candidate.signedUrl) {
    return (
      <video
        className="aspect-[4/3] w-full rounded-[1.3rem] border border-white/70 bg-black/80 object-cover shadow-whisper"
        muted
        playsInline
        preload="metadata"
        src={candidate.signedUrl}
      />
    );
  }

  return (
    <div className="ui-gradient-memory flex aspect-[4/3] items-end rounded-[1.3rem] border border-white/70 p-4 shadow-whisper">
      <div className="rounded-pill border border-white/65 bg-white/78 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
        {candidate.mediaType === "video" ? videoLabel : fallbackLabel}
      </div>
    </div>
  );
};

export const CreateAlbumForm = ({
  candidates,
  timeZone,
  tripId,
}: CreateAlbumFormProps): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { format, t: formT } = useI18n("forms.album");
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createAlbumAction);
  const form = useForm<CreateAlbumValues>({
    defaultValues: {
      description: "",
      memoryMediaIds: [],
      title: "",
    },
    resolver: zodResolver(buildCreateAlbumSchema(formT)),
  });
  const selectedMediaIds =
    useWatch({
      control: form.control,
      name: "memoryMediaIds",
    }) ?? [];

  const descriptionErrorMessage = form.formState.errors.description?.message;
  const mediaErrorMessage = form.formState.errors.memoryMediaIds?.message;
  const titleErrorMessage = form.formState.errors.title?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set("description", values.description ?? "");
    values.memoryMediaIds.forEach((mediaId) => {
      payload.append("memoryMediaIds", mediaId);
    });
    payload.set("title", values.title);
    payload.set("tripId", tripId);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || "unexpectedError";
      toast.success(actionsT(actionMessageKey));
      form.reset({
        description: "",
        memoryMediaIds: [],
        title: "",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: appQueryKeys.albums() }),
        queryClient.invalidateQueries({ queryKey: appQueryKeys.trip(tripId) }),
      ]);
    } catch (error: unknown) {
      console.error("Failed to submit album form", error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection
        errorId="album-title-error"
        errorMessage={titleErrorMessage}
        htmlFor="albumTitle"
        label={formT("titleLabel")}
      >
        <Input
          aria-describedby={titleErrorMessage ? "album-title-error" : undefined}
          aria-invalid={Boolean(titleErrorMessage)}
          id="albumTitle"
          placeholder={formT("titlePlaceholder")}
          type="text"
          {...form.register("title")}
        />
      </FormSection>

      <FormSection
        description={formT("descriptionDescription")}
        errorId="album-description-error"
        errorMessage={descriptionErrorMessage}
        htmlFor="albumDescription"
        label={formT("descriptionLabel")}
      >
        <Textarea
          aria-describedby={descriptionErrorMessage ? "album-description-error" : undefined}
          aria-invalid={Boolean(descriptionErrorMessage)}
          id="albumDescription"
          placeholder={formT("descriptionPlaceholder")}
          rows={4}
          {...form.register("description")}
        />
      </FormSection>

      <FormSection
        description={formT("mediaDescription", {
          count: selectedMediaIds.length,
        })}
        errorId="album-media-error"
        errorMessage={mediaErrorMessage}
        label={formT("mediaLabel")}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const inputId = `create-album-media-${candidate.id}`;
            const isSelected = selectedMediaIds.includes(candidate.id);
            const happenedAt = parseISO(candidate.happenedAt);
            const happenedAtLabel = Number.isNaN(happenedAt.getTime())
              ? candidate.happenedAt
              : format.dateTime(happenedAt, {
                  day: "numeric",
                  month: "short",
                  timeZone,
                  year: "numeric",
                });

            return (
              <label className="block" htmlFor={inputId} key={candidate.id}>
                <input
                  aria-describedby={mediaErrorMessage ? "album-media-error" : undefined}
                  className="sr-only"
                  id={inputId}
                  type="checkbox"
                  value={candidate.id}
                  {...form.register("memoryMediaIds")}
                />
                <div
                  className={cn(
                    "flex h-full cursor-pointer flex-col gap-3 rounded-[1.6rem] border bg-white/72 p-4 shadow-whisper transition-all",
                    isSelected
                      ? "border-primary shadow-cloud ring-2 ring-primary/20"
                      : "border-white/70 hover:-translate-y-0.5 hover:shadow-cloud",
                  )}
                >
                  {renderMediaPreview(
                    candidate,
                    formT("mediaFallback"),
                    formT("videoFallback"),
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="ui-meta">{happenedAtLabel}</p>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                        {isSelected ? formT("selectedLabel") : formT("selectLabel")}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
                      {candidate.note?.trim() || formT("mediaNoteFallback")}
                    </p>
                    {candidate.locationName ? (
                      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        {candidate.locationName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </FormSection>

      <Button
        busyLabel={commonT("working")}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
