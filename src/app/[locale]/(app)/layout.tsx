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
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-5 pt-5 pb-32 md:px-7 md:pt-6 md:pb-12 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden">
        <div className="absolute top-10 left-[-8%] size-64 rounded-full bg-[rgba(255,209,209,0.34)] blur-3xl" />
        <div className="absolute top-[-2%] right-[-4%] size-72 rounded-full bg-[rgba(255,148,148,0.16)] blur-3xl" />
      </div>
      <div className="mb-6 rounded-[2rem] border border-white/65 bg-[rgba(255,249,242,0.58)] px-5 py-4 shadow-whisper backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-meta ui-couple-mark">{t('mobile.eyebrow')}</p>
            <p className="mt-2 font-display text-[2rem] tracking-[-0.045em] text-foreground">
              PhuocAnh
            </p>
          </div>
          <Link
            className="inline-flex items-center rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-foreground uppercase shadow-whisper"
            href="/memories/new"
          >
            {t('mobile.addMemory')}
          </Link>
        </div>
      </div>
      <div className="flex flex-1 gap-6 lg:gap-8">
        <SideNavigation />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <BottomNavigation />
    </div>
  );
}
