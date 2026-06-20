import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CreateMemoryForm } from '@/components/forms/create-memory-form';

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/app/actions/memory-actions', () => ({
  createMemoryAction: vi.fn(),
}));

vi.mock('@/components/forms/location-picker', () => ({
  LocationPicker: () => null,
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: storageMocks.upload,
        remove: storageMocks.remove,
      }),
    },
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => routerMocks,
}));

vi.mock('@/lib/query/app-query-updates', () => ({
  invalidateMemoryCreated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/query/action-mutation', () => ({
  getActionErrorMessage: () => 'unexpectedError',
  useActionMutation: () => ({
    isPending: false,
    mutateAsync: mutationMocks.mutateAsync,
  }),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        mediaLabel: 'Media',
        removeMedia: 'Remove',
        submit: 'Save memory',
        working: 'Working',
        happenedAtLabel: 'Happened at',
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

const renderForm = (): ReturnType<typeof render> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui: ReactElement = (
    <QueryClientProvider client={queryClient}>
      <CreateMemoryForm coupleId="couple-123" />
    </QueryClientProvider>
  );

  return render(ui);
};

const selectFile = async (file: File): Promise<void> => {
  const user = userEvent.setup();
  const input = screen.getByLabelText('Media', { exact: false });
  await user.upload(input, file);
};

describe('CreateMemoryForm media cleanup', () => {
  beforeEach(() => {
    storageMocks.upload.mockReset().mockResolvedValue({ error: null });
    storageMocks.remove.mockReset().mockResolvedValue({ error: null });
    routerMocks.replace.mockReset();
    mutationMocks.mutateAsync.mockReset().mockResolvedValue({
      message: 'memory.created',
      status: 'success',
    });
  });

  afterEach(() => {
    cleanup();
  });

  test('removes the uploaded object when a selected file is deselected', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(storageMocks.upload).toHaveBeenCalledTimes(1));
    const uploadedPath = storageMocks.upload.mock.calls[0]?.[0] as string;

    await user.click(screen.getByRole('button', { name: /Remove/ }));

    await waitFor(() => expect(storageMocks.remove).toHaveBeenCalledWith([uploadedPath]));
  });

  test('rejects an invalid file without uploading it (no orphan to clean)', async () => {
    renderForm();

    await selectFile(new File(['x'], 'notes.pdf', { type: 'application/pdf' }));

    // Invalid MIME types never reach storage, so there is nothing to orphan.
    expect(storageMocks.upload).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });

  test('removes uploaded-but-unsubmitted objects on unmount', async () => {
    const { unmount } = renderForm();

    await selectFile(new File(['x'], 'clip.mp4', { type: 'video/mp4' }));
    await waitFor(() => expect(storageMocks.upload).toHaveBeenCalledTimes(1));
    const uploadedPath = storageMocks.upload.mock.calls[0]?.[0] as string;

    unmount();

    await waitFor(() => expect(storageMocks.remove).toHaveBeenCalledWith([uploadedPath]));
  });

  test('does not remove media on a successful submit (ownership transferred)', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));
    await waitFor(() => expect(storageMocks.upload).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Save memory' }));

    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalled());
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });
});
