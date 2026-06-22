// Reminder email builders, extracted from index.ts so they can be unit-tested without loading
// the module's top-level Deno.serve / env parsing. These build the email body purely from the
// claimed reminder's payload projection (title, dateToken) — the decrypted future-note body is
// never fetched into this path, so it cannot leak into an unlock-reminder email.

// Structural view of the fields the email builders read. The full claimed-reminder type in
// index.ts (z.infer<typeof claimedReminderDeliverySchema>) is a structural superset, so passing
// it where ReminderEmailContent is expected keeps the call sites unchanged.
export interface ReminderEmailContent {
  readonly kind: 'countdown_day_of' | 'future_note_unlock';
  readonly payload: {
    readonly dateToken: string;
    readonly title: string;
  };
}

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const buildReminderText = (reminder: ReminderEmailContent, reminderUrl: string): string => {
  const intro =
    reminder.kind === 'countdown_day_of'
      ? `Your countdown is due today: ${reminder.payload.title}.`
      : `Your future note is unlocked today: ${reminder.payload.title}.`;

  return `${intro}\n\nDate: ${reminder.payload.dateToken}\nOpen in app: ${reminderUrl}`;
};

export const buildReminderHtml = (reminder: ReminderEmailContent, reminderUrl: string): string => {
  const intro =
    reminder.kind === 'countdown_day_of'
      ? 'Your countdown is due today.'
      : 'Your future note is unlocked today.';
  const escapedIntro = escapeHtml(intro);
  const escapedTitle = escapeHtml(reminder.payload.title);
  const escapedDateToken = escapeHtml(reminder.payload.dateToken);
  const escapedReminderUrl = escapeHtml(reminderUrl);

  return [
    `<p>${escapedIntro}</p>`,
    `<p><strong>${escapedTitle}</strong></p>`,
    `<p>Date: ${escapedDateToken}</p>`,
    `<p><a href="${escapedReminderUrl}">Open in app</a></p>`,
  ].join('');
};
