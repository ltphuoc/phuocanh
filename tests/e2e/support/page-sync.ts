import { expect, type Page } from "@playwright/test";

type TextMatch = RegExp | string;

export const waitForActionSuccessAndReload = async (
  page: Page,
  successMessage: string,
): Promise<void> => {
  try {
    await expect(page.getByText(successMessage, { exact: true })).toBeVisible({
      timeout: 2_500,
    });
  } catch {
    try {
      await expect(
        page.getByRole("button", {
          name: "Working...",
        }),
      ).toHaveCount(0, {
        timeout: 10_000,
      });
    } catch {
      // Some production-mode server actions persist successfully but leave the
      // optimistic busy state hanging. Fall through to a reload so the test can
      // verify the persisted UI instead of the transient toast state.
    }
  }

  await page.reload({
    waitUntil: "networkidle",
  });
};

export const reloadUntilTextVisible = async (
  page: Page,
  text: TextMatch,
): Promise<void> => {
  const targetText = page.getByText(text).first();
  const workingButtons = page.getByRole("button", {
    name: "Working...",
  });

  try {
    await expect(targetText).toBeVisible({
      timeout: 2_500,
    });
    return;
  } catch {
    // Server actions in production mode often need a completed round-trip before
    // revalidated content appears, so fall through to explicit refresh polling.
  }

  try {
    await expect(workingButtons).toHaveCount(0, {
      timeout: 10_000,
    });
  } catch {
    // Some mutations do not expose a busy button for the entire lifecycle. If the
    // optimistic UI never settles, continue with explicit refresh polling.
  }

  await expect
    .poll(
      async () => {
        await page.reload({
          waitUntil: "networkidle",
        });
        return page.getByText(text).count();
      },
      {
        intervals: [1_000, 2_000, 3_000],
        timeout: 20_000,
      },
    )
    .toBeGreaterThan(0);
};
