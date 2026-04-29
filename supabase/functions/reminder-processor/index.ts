import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend';
import { z } from 'npm:zod@4.3.6';

const CLAIM_BATCH_SIZE = 25;
const MAX_BACKOFF_MINUTES = 6 * 60;

const envSchema = z.object({
  REMINDER_APP_BASE_URL: z.url().default('http://localhost:3000'),
  REMINDER_FROM_EMAIL: z.email(),
  REMINDER_FROM_NAME: z.string().trim().min(1).default('PhuocAnh'),
  REMINDER_LOCALE: z.string().trim().min(1).default('vi'),
  RESEND_API_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  SUPABASE_URL: z.url(),
});

const reminderPayloadSchema = z.object({
  dateToken: z.string().trim().min(1),
  routePath: z.string().trim().startsWith('/'),
  title: z.string().trim().min(1),
});

const claimedReminderDeliverySchema = z.object({
  attempts: z.number().int().nonnegative(),
  due_at: z.string().trim().min(1),
  id: z.string().uuid(),
  kind: z.enum(['countdown_day_of', 'future_note_unlock']),
  max_attempts: z.number().int().positive(),
  payload: reminderPayloadSchema,
  recipient_email: z.email(),
});

const claimedReminderDeliveriesSchema = z.array(claimedReminderDeliverySchema);

const buildReminderUrl = (appBaseUrl: string, locale: string, routePath: string): string =>
  new URL(`/${locale}${routePath}`, appBaseUrl).toString();

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getReminderIdempotencyKey = (reminderId: string): string => `reminder-delivery/${reminderId}`;

const buildReminderSubject = (
  kind: z.infer<typeof claimedReminderDeliverySchema>['kind'],
  title: string,
): string => (kind === 'countdown_day_of' ? `${title} is today` : `Future note unlocked: ${title}`);

const buildReminderText = (
  reminder: z.infer<typeof claimedReminderDeliverySchema>,
  reminderUrl: string,
): string => {
  const intro =
    reminder.kind === 'countdown_day_of'
      ? `Your countdown is due today: ${reminder.payload.title}.`
      : `Your future note is unlocked today: ${reminder.payload.title}.`;

  return `${intro}\n\nDate: ${reminder.payload.dateToken}\nOpen in app: ${reminderUrl}`;
};

const buildReminderHtml = (
  reminder: z.infer<typeof claimedReminderDeliverySchema>,
  reminderUrl: string,
): string => {
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

const getRetryDelayMinutes = (attempts: number): number => {
  const exponentialDelay = Math.min(2 ** Math.max(attempts - 1, 0) * 15, MAX_BACKOFF_MINUTES);

  return exponentialDelay;
};

const env = envSchema.parse({
  REMINDER_APP_BASE_URL: Deno.env.get('REMINDER_APP_BASE_URL'),
  REMINDER_FROM_EMAIL: Deno.env.get('REMINDER_FROM_EMAIL'),
  REMINDER_FROM_NAME: Deno.env.get('REMINDER_FROM_NAME'),
  REMINDER_LOCALE: Deno.env.get('REMINDER_LOCALE'),
  RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
});

const resend = new Resend(env.RESEND_API_KEY);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const markReminderSent = async (
  reminderId: string,
  providerMessageId: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from('reminder_deliveries')
    .update({
      failed_at: null,
      last_error: null,
      not_before: new Date().toISOString(),
      processing_started_at: null,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      status: 'sent',
    })
    .eq('id', reminderId);

  if (error) {
    throw new Error(`Failed to mark reminder ${reminderId} as sent: ${error.message}`);
  }
};

const markReminderFailure = async (
  reminder: z.infer<typeof claimedReminderDeliverySchema>,
  errorMessage: string,
): Promise<void> => {
  const now = new Date();
  const hasAttemptsRemaining = reminder.attempts < reminder.max_attempts;
  const nextAttemptAt = hasAttemptsRemaining
    ? new Date(now.getTime() + getRetryDelayMinutes(reminder.attempts) * 60_000).toISOString()
    : now.toISOString();

  const { error } = await supabase
    .from('reminder_deliveries')
    .update({
      failed_at: hasAttemptsRemaining ? null : now.toISOString(),
      last_error: errorMessage,
      not_before: nextAttemptAt,
      processing_started_at: null,
      status: hasAttemptsRemaining ? 'pending' : 'failed',
    })
    .eq('id', reminder.id);

  if (error) {
    throw new Error(`Failed to mark reminder ${reminder.id} as failed: ${error.message}`);
  }
};

const claimReminderDeliveries = async (): Promise<
  readonly z.infer<typeof claimedReminderDeliverySchema>[]
> => {
  const { data, error } = await supabase.rpc('claim_reminder_deliveries', {
    max_batch_size: CLAIM_BATCH_SIZE,
  });

  if (error) {
    throw new Error(`Failed to claim reminder deliveries: ${error.message}`);
  }

  return claimedReminderDeliveriesSchema.parse(data ?? []);
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const reminders = await claimReminderDeliveries();
  const results: Array<{ id: string; status: 'sent' | 'failed' }> = [];

  for (const reminder of reminders) {
    const reminderUrl = buildReminderUrl(
      env.REMINDER_APP_BASE_URL,
      env.REMINDER_LOCALE,
      reminder.payload.routePath,
    );
    const idempotencyKey = getReminderIdempotencyKey(reminder.id);

    try {
      const { data, error } = await resend.emails.send(
        {
          from: `${env.REMINDER_FROM_NAME} <${env.REMINDER_FROM_EMAIL}>`,
          html: buildReminderHtml(reminder, reminderUrl),
          subject: buildReminderSubject(reminder.kind, reminder.payload.title),
          text: buildReminderText(reminder, reminderUrl),
          to: [reminder.recipient_email],
        },
        {
          idempotencyKey,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      await markReminderSent(reminder.id, data?.id ?? null);
      results.push({ id: reminder.id, status: 'sent' });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown reminder delivery failure';
      await markReminderFailure(reminder, errorMessage);
      results.push({ id: reminder.id, status: 'failed' });
    }
  }

  return Response.json({
    processed: reminders.length,
    results,
  });
});
