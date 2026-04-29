'use client';

import type { ReactElement } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { addWishItemAction } from '@/app/actions/list-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateHomeAndLists } from '@/lib/query/app-query-updates';

const wishItemSchema = z.object({
  category: z.enum(['place', 'food', 'movie']),
  note: z.string().max(200).optional(),
  title: z.string().min(1).max(120),
});

type WishItemValues = z.infer<typeof wishItemSchema>;

export const WishItemForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.wishItem');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(addWishItemAction);
  const form = useForm<WishItemValues>({
    defaultValues: {
      category: 'place',
      note: '',
      title: '',
    },
    resolver: zodResolver(wishItemSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('category', values.category);
    payload.set('title', values.title);
    payload.set('note', values.note ?? '');

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        category: 'place',
        note: '',
        title: '',
      });
      await invalidateHomeAndLists(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit wish item form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <FormSection
        htmlFor="wishCategory"
        label={formT('categoryLabel')}
      >
        <Select
          id="wishCategory"
          {...form.register('category')}
        >
          <option value="place">{formT('category.place')}</option>
          <option value="food">{formT('category.food')}</option>
          <option value="movie">{formT('category.movie')}</option>
        </Select>
      </FormSection>
      <FormSection
        htmlFor="wishTitle"
        label={formT('titleLabel')}
      >
        <Input
          id="wishTitle"
          placeholder={formT('titlePlaceholder')}
          type="text"
          {...form.register('title')}
        />
      </FormSection>
      <FormSection
        htmlFor="wishNote"
        label={formT('noteLabel')}
      >
        <Input
          id="wishNote"
          placeholder={formT('notePlaceholder')}
          type="text"
          {...form.register('note')}
        />
      </FormSection>
      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
        variant="outline"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
