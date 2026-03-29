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
import { addWishItemAction } from "@/app/actions/list-actions";
import { useI18n } from "@/hooks/useI18n";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { initialActionState } from "@/lib/actions/action-state";

const wishItemSchema = z.object({
  category: z.enum(["place", "food", "movie"]),
  note: z.string().max(200).optional(),
  title: z.string().min(1).max(120),
});

type WishItemValues = z.infer<typeof wishItemSchema>;

export const WishItemForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.wishItem");
  const [state, submitAction, isPending] = useActionState(
    addWishItemAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<WishItemValues>({
    defaultValues: {
      category: "place",
      note: "",
      title: "",
    },
    resolver: zodResolver(wishItemSchema),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      form.reset({
        category: "place",
        note: "",
        title: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, form, hasSubmitted, state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("category", values.category);
    payload.set("title", values.title);
    payload.set("note", values.note ?? "");
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection htmlFor="wishCategory" label={formT("categoryLabel")}>
        <Select id="wishCategory" {...form.register("category")}>
          <option value="place">{formT("category.place")}</option>
          <option value="food">{formT("category.food")}</option>
          <option value="movie">{formT("category.movie")}</option>
        </Select>
      </FormSection>
      <FormSection htmlFor="wishTitle" label={formT("titleLabel")}>
        <Input
          id="wishTitle"
          placeholder={formT("titlePlaceholder")}
          type="text"
          {...form.register("title")}
        />
      </FormSection>
      <FormSection htmlFor="wishNote" label={formT("noteLabel")}>
        <Input
          id="wishNote"
          placeholder={formT("notePlaceholder")}
          type="text"
          {...form.register("note")}
        />
      </FormSection>
      <Button
        busyLabel={commonT("working")}
        className="w-full md:w-auto"
        isBusy={isPending}
        type="submit"
        variant="outline"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
