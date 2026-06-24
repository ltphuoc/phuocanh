import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.3.6';

import { INVOKE_SECRET_HEADER, timingSafeEqualStrings } from './invoke-auth.ts';
import { buildReminderHtml, buildReminderText } from './reminder-email.ts';

const CLAIM_BATCH_SIZE = 25;
const MAX_BACKOFF_MINUTES = 6 * 60;
const IMPLICIT_TLS_PORT = 465;

const envSchema = z.object({
  REMINDER_APP_BASE_URL: z.url().default('http://localhost:3000'),
  REMINDER_FROM_EMAIL: z.email(),
  REMINDER_FROM_NAME: z.string().trim().min(1).default('PhuocAnh'),
  REMINDER_INVOKE_SECRET: z.string().trim().min(1).optional(),
  REMINDER_LOCALE: z.string().trim().min(1).default('vi'),
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(IMPLICIT_TLS_PORT),
  SMTP_USERNAME: z.string().trim().min(1),
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

const buildReminderSubject = (
  kind: z.infer<typeof claimedReminderDeliverySchema>['kind'],
  title: string,
): string => (kind === 'countdown_day_of' ? `${title} is today` : `Future note unlocked: ${title}`);

const getRetryDelayMinutes = (attempts: number): number => {
  const exponentialDelay = Math.min(2 ** Math.max(attempts - 1, 0) * 15, MAX_BACKOFF_MINUTES);

  return exponentialDelay;
};

const env = envSchema.parse({
  REMINDER_APP_BASE_URL: Deno.env.get('REMINDER_APP_BASE_URL'),
  REMINDER_FROM_EMAIL: Deno.env.get('REMINDER_FROM_EMAIL'),
  REMINDER_FROM_NAME: Deno.env.get('REMINDER_FROM_NAME'),
  REMINDER_INVOKE_SECRET: Deno.env.get('REMINDER_INVOKE_SECRET'),
  REMINDER_LOCALE: Deno.env.get('REMINDER_LOCALE'),
  SMTP_HOST: Deno.env.get('SMTP_HOST'),
  SMTP_PASSWORD: Deno.env.get('SMTP_PASSWORD'),
  SMTP_PORT: Deno.env.get('SMTP_PORT'),
  SMTP_USERNAME: Deno.env.get('SMTP_USERNAME'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// One client is opened per batch run (see the handler) and closed in a finally; SMTP
// connections are stateful, unlike the previous stateless Resend HTTP client.
const createSmtpClient = (): SMTPClient =>
  new SMTPClient({
    connection: {
      hostname: env.SMTP_HOST,
      port: env.SMTP_PORT,
      tls: env.SMTP_PORT === IMPLICIT_TLS_PORT,
      auth: {
        username: env.SMTP_USERNAME,
        password: env.SMTP_PASSWORD,
      },
    },
  });

const markReminderSent = async (reminderId: string): Promise<void> => {
  const { error } = await supabase
    .from('reminder_deliveries')
    .update({
      failed_at: null,
      last_error: null,
      not_before: new Date().toISOString(),
      processing_started_at: null,
      provider_message_id: null,
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

  // Authenticate the caller before any DB work. Only the pg_cron job (which sends
  // the shared secret) may trigger a run; the public anon key + function URL are
  // not sufficient. Fail closed when the secret is not configured on the function.
  const providedSecret = request.headers.get(INVOKE_SECRET_HEADER) ?? '';
  if (
    !env.REMINDER_INVOKE_SECRET ||
    !timingSafeEqualStrings(env.REMINDER_INVOKE_SECRET, providedSecret)
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  const reminders = await claimReminderDeliveries();
  const results: Array<{ id: string; status: 'sent' | 'failed' }> = [];

  // Open a single SMTP connection for the whole batch and close it in finally; skip
  // opening one entirely when nothing was claimed. Delivery is governed by the claim/status
  // state machine: a claimed row reverts to pending after the reclaim window if it is never
  // acked. The (kind, source_id, recipient_user_id) constraint dedups enqueued rows, not the
  // redelivery of one row. Unlike Resend, SMTP has no idempotency key, so a crash between a
  // 250 ack and markReminderSent leaves a narrow at-least-once window — accepted here, since
  // a duplicate reminder is far less costly than a missed one.
  const smtpClient = reminders.length > 0 ? createSmtpClient() : null;

  try {
    for (const reminder of reminders) {
      const reminderUrl = buildReminderUrl(
        env.REMINDER_APP_BASE_URL,
        env.REMINDER_LOCALE,
        reminder.payload.routePath,
      );

      try {
        await smtpClient!.send({
          from: `${env.REMINDER_FROM_NAME} <${env.REMINDER_FROM_EMAIL}>`,
          to: reminder.recipient_email,
          subject: buildReminderSubject(reminder.kind, reminder.payload.title),
          content: buildReminderText(reminder, reminderUrl),
          html: buildReminderHtml(reminder, reminderUrl),
        });

        await markReminderSent(reminder.id);
        results.push({ id: reminder.id, status: 'sent' });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown reminder delivery failure';
        await markReminderFailure(reminder, errorMessage);
        results.push({ id: reminder.id, status: 'failed' });
      }
    }
  } finally {
    await smtpClient?.close();
  }

  return Response.json({
    processed: reminders.length,
    results,
  });
});
