import { assertFalse, assertStringIncludes } from 'jsr:@std/assert@1';

import { buildReminderHtml, buildReminderText, escapeHtml } from './reminder-email.ts';

// A future-note body string that must NEVER appear in any reminder email. It is deliberately not
// part of the payload — the builders only ever read title + dateToken, so a regression that
// started rendering a body would have to invent it. Its absence proves the privacy boundary.
const SENTINEL_BODY = 'SECRET-FUTURE-NOTE-BODY-must-never-render';
const REMINDER_URL = 'https://app.example/vi/future-notes';

const unlockReminder = {
  kind: 'future_note_unlock' as const,
  payload: { dateToken: '2026-06-01', title: 'Anniversary surprise' },
};

// The unlock email carries the title, the date token, and the in-app link, and nothing
// resembling the note body.
Deno.test('future_note_unlock text includes title, date, and link but never a body', () => {
  const text = buildReminderText(unlockReminder, REMINDER_URL);

  assertStringIncludes(text, 'Anniversary surprise');
  assertStringIncludes(text, '2026-06-01');
  assertStringIncludes(text, REMINDER_URL);
  assertFalse(text.includes(SENTINEL_BODY));
});

Deno.test('future_note_unlock html includes title, date, and link but never a body', () => {
  const html = buildReminderHtml(unlockReminder, REMINDER_URL);

  assertStringIncludes(html, 'Anniversary surprise');
  assertStringIncludes(html, '2026-06-01');
  assertStringIncludes(html, REMINDER_URL);
  assertFalse(html.includes(SENTINEL_BODY));
});

Deno.test('buildReminderHtml escapes a script-bearing title', () => {
  const html = buildReminderHtml(
    {
      kind: 'future_note_unlock',
      payload: { dateToken: '2026-06-01', title: '<script>alert(1)</script>' },
    },
    REMINDER_URL,
  );

  assertFalse(html.includes('<script>'));
  assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt;');
});

Deno.test('escapeHtml encodes all five HTML-significant characters', () => {
  assertStringIncludes(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});
