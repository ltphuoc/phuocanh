import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { UpdateCoupleTimezoneForm } from '@/components/forms/update-couple-timezone-form';

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/app/actions/planning-actions', () => ({
  updateCoupleTimezoneAction: vi.fn(),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: (namespace: string) => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        confirmCancel: 'Cancel',
        confirmProceed: 'Yes, change timezone',
        confirmWarning: 'Changing your timezone may clear today’s not-yet-revealed game rounds.',
        description: 'Shared couple timezone',
        label: 'Couple timezone',
        placeholder: 'Asia/Ho_Chi_Minh',
        submit: 'Save timezone',
        unexpectedError: 'Unexpected error',
        working: 'Working',
        'validation.invalid': 'Enter a valid IANA timezone.',
        'validation.required': 'Timezone is required.',
      };

      if (namespace === 'forms.settingsTimezone' && key === 'currentValue') {
        return `Current timezone: ${values?.timeZone ?? ''}`;
      }

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/query/action-mutation', () => ({
  getActionErrorMessage: () => 'unexpectedError',
  useActionMutation: () => ({
    isPending: false,
    mutateAsync: mutationMocks.mutateAsync,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const renderWithQueryClient = (ui: ReactElement): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('UpdateCoupleTimezoneForm', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mutationMocks.mutateAsync.mockReset();
    mutationMocks.mutateAsync.mockResolvedValue({
      message: 'settings.timezone.updated',
      status: 'success',
    });
  });

  test('shows inline validation and skips mutation for unsupported timezones', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<UpdateCoupleTimezoneForm currentTimeZone="Asia/Ho_Chi_Minh" />);

    const timezoneInput = screen.getByLabelText('Couple timezone', { exact: false });
    await user.clear(timezoneInput);
    await user.type(timezoneInput, 'Not/A_Real_Zone');
    await user.click(screen.getByRole('button', { name: 'Save timezone' }));

    expect(await screen.findByText('Enter a valid IANA timezone.')).toBeDefined();
    expect(timezoneInput.getAttribute('aria-invalid')).toBe('true');
    expect(mutationMocks.mutateAsync).not.toHaveBeenCalled();
  });

  test('clears validation and submits valid timezone values after confirmation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<UpdateCoupleTimezoneForm currentTimeZone="Asia/Ho_Chi_Minh" />);

    const timezoneInput = screen.getByLabelText('Couple timezone', { exact: false });
    await user.clear(timezoneInput);
    await user.type(timezoneInput, 'Not/A_Real_Zone');
    await user.click(screen.getByRole('button', { name: 'Save timezone' }));
    expect(await screen.findByText('Enter a valid IANA timezone.')).toBeDefined();

    await user.clear(timezoneInput);
    await user.type(timezoneInput, 'America/New_York');
    expect(screen.queryByText('Enter a valid IANA timezone.')).toBeNull();

    // A changed zone is gated: clicking save reveals the confirmation, not a mutation.
    await user.click(screen.getByRole('button', { name: 'Save timezone' }));
    expect(mutationMocks.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, change timezone' }));

    await waitFor(() => expect(mutationMocks.mutateAsync).toHaveBeenCalledTimes(1));
    const submittedPayload = mutationMocks.mutateAsync.mock.calls[0]?.[0] as FormData;
    expect(submittedPayload.get('timeZone')).toBe('America/New_York');
  });

  test('cancelling the confirmation does not run the mutation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<UpdateCoupleTimezoneForm currentTimeZone="Asia/Ho_Chi_Minh" />);

    const timezoneInput = screen.getByLabelText('Couple timezone', { exact: false });
    await user.clear(timezoneInput);
    await user.type(timezoneInput, 'America/New_York');
    await user.click(screen.getByRole('button', { name: 'Save timezone' }));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mutationMocks.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save timezone' })).toBeDefined();
  });
});
