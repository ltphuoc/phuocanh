import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { QueryRefetchErrorBanner } from '@/components/query/query-status';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        refetchFailed: 'Could not refresh — showing the last loaded data.',
        tryAgain: 'Try again',
      };
      return translations[key] ?? key;
    },
  }),
}));

afterEach(() => {
  cleanup();
});

describe('QueryRefetchErrorBanner', () => {
  test('shows the stale-data notice and a retry control', () => {
    render(<QueryRefetchErrorBanner onRetry={vi.fn()} />);

    expect(screen.getByText('Could not refresh — showing the last loaded data.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  test('invokes onRetry when the retry control is clicked', async () => {
    const onRetry = vi.fn();
    render(<QueryRefetchErrorBanner onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
