import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { getTranslations } from 'next-intl/server';

import { CompleteOnboardingForm } from '@/components/forms/complete-onboarding-form';
import { AuthShell } from '@/components/layout/auth-shell';
import { Link, redirect } from '@/i18n/navigation';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { getAuthGateState } from '@/lib/server/couple-context';

interface OnboardingPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: OnboardingPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'onboarding');

export default async function OnboardingPage({
  params,
}: OnboardingPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [t, commonT] = await Promise.all([
    getTranslations({
      locale,
      namespace: 'auth.onboarding',
    }),
    getTranslations({
      locale,
      namespace: 'common',
    }),
  ]);
  const state = await getAuthGateState();

  if (state.status === 'unauthenticated') {
    redirect({
      href: '/login',
      locale,
    });
  }

  if (state.status === 'ready') {
    redirect({
      href: '/home',
      locale,
    });
  }

  if (state.status === 'needs_invite') {
    redirect({
      href: '/accept-invite',
      locale,
    });
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
    >
      <AuthShell
        helper={t('helper')}
        helperTitle={t('helperTitle')}
        title={t('title')}
      >
        <CompleteOnboardingForm />
        <Link
          className="text-xs font-semibold text-muted-foreground underline decoration-primary/70 underline-offset-2"
          href="/login"
        >
          {commonT('backToLogin')}
        </Link>
      </AuthShell>
    </main>
  );
}
