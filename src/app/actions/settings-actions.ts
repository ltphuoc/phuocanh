'use server';

import type { ActionState } from '@/lib/actions/action-state';

import { z } from 'zod';

import { createErrorState, createSuccessState } from '@/lib/actions/action-state';
import { revalidateLocalizedPath } from '@/lib/i18n/revalidate';
import { requireReadyCoupleContext } from '@/lib/server/couple-context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MEMORY_MEDIA_BUCKET = 'memory-media';
// storage.remove takes a list; chunk it so a very large library stays under request limits.
const STORAGE_REMOVE_CHUNK = 100;

// A typed confirmation guards the destructive, irreversible erase even though the UI
// already gates it — defense-in-depth against an accidental programmatic call.
const eraseCoupleSpaceSchema = z.object({
  confirmation: z.literal('DELETE'),
});

export const eraseCoupleSpaceAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    eraseCoupleSpaceSchema.parse({
      confirmation: formData.get('confirmation'),
    });

    const context = await requireReadyCoupleContext();
    const supabase = await createSupabaseServerClient();

    // Read the exact storage paths BEFORE any delete: memory_media is the only source of
    // the couple's object keys and the DB erase destroys it. Wiping storage first keeps
    // the action retryable — a crash before the RPC leaves memory_media intact to re-read.
    const { data: mediaRows, error: mediaError } = await supabase
      .from('memory_media')
      .select('storage_path')
      .eq('couple_id', context.coupleId);

    if (mediaError) {
      console.error('Failed to read memory media before erase', mediaError);
      return createErrorState('unexpectedError');
    }

    const storagePaths = mediaRows
      .map((row) => row.storage_path)
      .filter((path): path is string => typeof path === 'string' && path.length > 0);

    for (let index = 0; index < storagePaths.length; index += STORAGE_REMOVE_CHUNK) {
      const chunk = storagePaths.slice(index, index + STORAGE_REMOVE_CHUNK);
      const { error: removeError } = await supabase.storage.from(MEMORY_MEDIA_BUCKET).remove(chunk);
      if (removeError) {
        // Stop before the DB delete so memory_media still lists what remains; the action
        // is safe to retry.
        console.error('Failed to wipe couple media during erase', removeError);
        return createErrorState('unexpectedError');
      }
    }

    const { error: eraseError } = await supabase.rpc('erase_couple_space');
    if (eraseError) {
      console.error('Failed to erase couple space', eraseError);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/home');
    revalidateLocalizedPath('/settings');

    return createSuccessState('settings.couple.erased');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('unexpectedError');
    }

    console.error('Failed to erase couple space', error);
    return createErrorState('unexpectedError');
  }
};
