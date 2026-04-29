'use server';

import type { Locale } from '@/i18n/routing';
import type {
  ActionMessageKey,
  ActionState,
  ActionStateWithData,
} from '@/lib/actions/action-state';

import { addDays } from 'date-fns';
import { hasLocale } from 'next-intl';
import { z } from 'zod';

import { routing } from '@/i18n/routing';
import { createErrorState, createSuccessState } from '@/lib/actions/action-state';
import { normalizeAuthRedirectPath } from '@/lib/auth/redirect-path';
import { env } from '@/lib/env';
import { toLocalizedPathname } from '@/lib/i18n/pathname';
import { revalidateLocalizedPath } from '@/lib/i18n/revalidate';
import { getAuthGateState, requireReadyCoupleContext } from '@/lib/server/couple-context';
import { getSiteUrl } from '@/lib/server/site-url';
import {
  createSupabaseServerClient,
  createSupabaseServerClientForUrl,
} from '@/lib/supabase/server';
import {
  getCurrentDateTokenInTimeZone,
  isSupportedCoupleTimeZone,
} from '@/lib/utils/couple-timezone';

interface InviteData {
  readonly inviteUrl: string;
}

const emailSchema = z.object({
  email: z.email(),
  locale: z.string().optional(),
  next: z.preprocess(
    (value) => (typeof value === 'string' ? value : undefined),
    z.string().optional(),
  ),
  origin: z.preprocess(
    (value) => (typeof value === 'string' ? value : undefined),
    z.url().optional(),
  ),
});

const inviteTokenSchema = z.object({
  token: z.uuid(),
});

const completeOnboardingSchema = z
  .object({
    confirmation: z.literal('true'),
    coupleName: z.string().trim().min(1).max(120),
    startedDate: z.iso.date(),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .refine((value) => isSupportedCoupleTimeZone(value)),
  })
  .superRefine(({ startedDate, timeZone }, context) => {
    if (!isSupportedCoupleTimeZone(timeZone)) {
      return;
    }

    const todayInSelectedTimezone = getCurrentDateTokenInTimeZone(timeZone);
    if (startedDate > todayInSelectedTimezone) {
      context.addIssue({
        code: 'custom',
        path: ['startedDate'],
        message: 'Started date cannot be in the future.',
      });
    }
  });

const mapAcceptInviteError = (message: string): ActionMessageKey => {
  if (message.includes('INVITE_NOT_FOUND')) {
    return 'auth.invite.invalidOrUsed';
  }

  if (message.includes('INVITE_EXPIRED')) {
    return 'auth.invite.expired';
  }

  if (message.includes('COUPLE_FULL')) {
    return 'auth.invite.coupleFull';
  }

  if (message.includes('AUTH_REQUIRED')) {
    return 'auth.signInRequired';
  }

  return 'unexpectedError';
};

const mapCompleteOnboardingError = (message: string): ActionMessageKey => {
  if (message.includes('COUPLE_EXISTS')) {
    return 'auth.onboarding.coupleExists';
  }

  if (message.includes('INVALID_TIMEZONE')) {
    return 'auth.onboarding.invalidSubmission';
  }

  if (message.includes('AUTH_REQUIRED')) {
    return 'auth.signInRequired';
  }

  return 'unexpectedError';
};

const normalizeSupabaseUrl = (urlValue: string): string =>
  urlValue.endsWith('/') ? urlValue.slice(0, -1) : urlValue;

const getAlternateLocalSupabaseUrl = (baseUrl: string): string | null => {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return normalizeSupabaseUrl(parsed.toString());
    }

    if (parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'localhost';
      return normalizeSupabaseUrl(parsed.toString());
    }

    return null;
  } catch {
    return null;
  }
};

const isNetworkFetchError = (message: string): boolean =>
  message.toLowerCase().includes('fetch failed');

interface MagicLinkRequestResult {
  readonly errorState: ActionState | null;
  readonly networkFailed: boolean;
}

const resolveLocale = (value: unknown): Locale => {
  if (typeof value === 'string' && hasLocale(routing.locales, value)) {
    return value;
  }

  return routing.defaultLocale;
};

const requestMagicLink = async (
  supabaseUrl: string,
  email: string,
  emailRedirectTo: string,
): Promise<MagicLinkRequestResult> => {
  try {
    const supabase = await createSupabaseServerClientForUrl(supabaseUrl);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (!error) {
      return {
        errorState: null,
        networkFailed: false,
      };
    }

    return {
      errorState: createErrorState('unexpectedError'),
      networkFailed: isNetworkFetchError(error.message),
    };
  } catch (error: unknown) {
    console.error('Failed to request magic link', error);
    return {
      errorState: createErrorState('unexpectedError'),
      networkFailed: error instanceof Error ? isNetworkFetchError(error.message) : false,
    };
  }
};

export const sendMagicLinkAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = emailSchema.parse({
      email: formData.get('email'),
      locale: formData.get('locale'),
      next: formData.get('next'),
      origin: formData.get('origin'),
    });

    const locale = resolveLocale(parsed.locale);
    const siteUrl = parsed.origin ? new URL(parsed.origin).origin : await getSiteUrl();
    const fallbackPath = toLocalizedPathname(locale, '/home');
    const nextPath = normalizeAuthRedirectPath(parsed.next, fallbackPath);
    const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const primarySupabaseUrl = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);

    const primaryError = await requestMagicLink(primarySupabaseUrl, parsed.email, emailRedirectTo);

    if (!primaryError.errorState) {
      return createSuccessState('auth.magicLink.sent');
    }

    const alternateSupabaseUrl = getAlternateLocalSupabaseUrl(primarySupabaseUrl);
    if (!alternateSupabaseUrl || !primaryError.networkFailed) {
      return primaryError.errorState;
    }

    const fallbackError = await requestMagicLink(
      alternateSupabaseUrl,
      parsed.email,
      emailRedirectTo,
    );
    if (!fallbackError.errorState) {
      return createSuccessState('auth.magicLink.sent');
    }

    if (fallbackError.networkFailed) {
      return createErrorState('auth.magicLink.unreachable');
    }

    return fallbackError.errorState;
  } catch (error: unknown) {
    console.error('Failed to send magic link', error);
    return createErrorState('unexpectedError');
  }
};

export const createInviteAction = async (
  previousState: ActionStateWithData<InviteData>,
  formData: FormData,
): Promise<ActionStateWithData<InviteData>> => {
  void previousState;

  try {
    const locale = resolveLocale(formData.get('locale'));
    const context = await requireReadyCoupleContext();
    const supabase = await createSupabaseServerClient();
    const siteUrl = await getSiteUrl();
    const token = crypto.randomUUID();
    const expiresAt = addDays(new Date(), 14).toISOString();

    const { error } = await supabase.from('couple_invites').insert({
      couple_id: context.coupleId,
      expires_at: expiresAt,
      invited_by_user_id: context.userId,
      token,
    });

    if (error) {
      console.error('Failed to create invite', error);
      return {
        ...createErrorState('unexpectedError'),
        data: undefined,
      };
    }

    return {
      ...createSuccessState('auth.invite.created'),
      data: {
        inviteUrl: `${siteUrl}${toLocalizedPathname(locale, `/accept-invite?token=${token}`)}`,
      },
    };
  } catch (error: unknown) {
    console.error('Failed to create invite', error);
    return {
      ...createErrorState('unexpectedError'),
      data: undefined,
    };
  }
};

export const acceptInviteAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = inviteTokenSchema.parse({
      token: formData.get('token'),
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createErrorState('auth.signInRequired');
    }

    const { data: acceptedRows, error } = await supabase.rpc('accept_couple_invite', {
      invite_token: parsed.token,
    });

    if (error) {
      return createErrorState(mapAcceptInviteError(error.message));
    }

    if (!acceptedRows?.[0]) {
      return createErrorState('auth.invite.invalidOrUsed');
    }

    revalidateLocalizedPath('/home');
    return createSuccessState('auth.invite.accepted');
  } catch (error: unknown) {
    console.error('Failed to accept invite', error);
    return createErrorState('unexpectedError');
  }
};

export const completeOnboardingAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const authGateState = await getAuthGateState();
    if (authGateState.status === 'unauthenticated') {
      return createErrorState('auth.signInRequired');
    }

    if (authGateState.status === 'ready') {
      return createSuccessState('auth.onboarding.completed');
    }

    if (authGateState.status === 'needs_invite') {
      return createErrorState('auth.onboarding.coupleExists');
    }

    const parsed = completeOnboardingSchema.parse({
      confirmation: formData.get('confirmation'),
      coupleName: formData.get('coupleName'),
      startedDate: formData.get('startedDate'),
      timeZone: formData.get('timeZone'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('bootstrap_first_couple', {
      couple_name: parsed.coupleName,
      started_date: parsed.startedDate,
      target_timezone: parsed.timeZone,
    });

    if (error) {
      return createErrorState(mapCompleteOnboardingError(error.message));
    }

    revalidateLocalizedPath('/home');
    revalidateLocalizedPath('/');
    return createSuccessState('auth.onboarding.completed');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('auth.onboarding.invalidSubmission');
    }

    console.error('Failed to complete onboarding', error);
    return createErrorState('unexpectedError');
  }
};
