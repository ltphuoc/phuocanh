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

    if (state.status === "success") {
      toast.success(state.message);
      form.reset({
        category: "place",
        note: "",
        title: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [form, hasSubmitted, state.message, state.status]);

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
      <FormSection htmlFor="wishCategory" label="Category">
        <Select id="wishCategory" {...form.register("category")}>
          <option value="place">Place</option>
          <option value="food">Food</option>
          <option value="movie">Movie</option>
        </Select>
      </FormSection>
      <FormSection htmlFor="wishTitle" label="Title">
        <Input
          id="wishTitle"
          placeholder="Try bánh xèo in Hội An"
          type="text"
          {...form.register("title")}
        />
      </FormSection>
      <FormSection htmlFor="wishNote" label="Note (optional)">
        <Input id="wishNote" placeholder="Optional note" type="text" {...form.register("note")} />
      </FormSection>
      <Button className="w-full md:w-auto" isBusy={isPending} type="submit" variant="outline">
        Add item
      </Button>
    </form>
  );
};
