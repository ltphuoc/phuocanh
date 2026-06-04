import type { ReactElement, ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { BottomNavigation } from '@/components/app/bottom-navigation';
import { SideNavigation } from '@/components/app/side-navigation';
import { Link, redirect } from '@/i18n/navigation';
import { resolveLocaleFromParams } from '@/i18n/server';
import { getAuthGateState } from '@/lib/server/couple-context';

interface AppLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export default async function AppLayout({
  children,
  params,
}: AppLayoutProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: 'appLayout',
  });
  const state = await getAuthGateState();
  if (state.status === 'unauthenticated') {
    redirect({
      href: '/login',
      locale,
    });
  }

  if (state.status === 'needs_invite') {
    redirect({
      href: '/accept-invite',
      locale,
    });
  }

  if (state.status === 'needs_onboarding') {
    redirect({
      href: '/onboarding',
      locale,
    });
  }

  return (
    <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1320px] flex-col px-5 pt-5 pb-32 md:px-7 md:pt-6 md:pb-12 lg:px-10">
      <div className="mb-6 rounded-hero border border-white/70 bg-bg-soft/68 px-4 py-3 shadow-whisper backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-meta ui-couple-mark">{t('mobile.eyebrow')}</p>
            <p
              className="mt-1 font-display text-title-lg text-foreground"
              translate="no"
            >
              PhuocAnh
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-pill border border-white/72 bg-white/76 px-4 py-2 text-xs font-semibold tracking-meta text-foreground uppercase shadow-whisper"
            href="/memories/new"
          >
            {t('mobile.addMemory')}
          </Link>
        </div>
      </div>
      <div className="flex flex-1 gap-6 lg:gap-8">
        <SideNavigation />
        <main
          className="flex min-w-0 flex-1 flex-col"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
