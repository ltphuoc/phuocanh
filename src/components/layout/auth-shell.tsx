import type { ReactElement, ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { PageContainer } from '@/components/layout/page-container';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';

interface AuthShellProps {
  readonly children: ReactNode;
  readonly helper: string;
  readonly helperTitle: string;
  readonly title: string;
}

export const AuthShell = async ({
  children,
  helper,
  helperTitle,
  title,
}: AuthShellProps): Promise<ReactElement> => {
  const t = await getTranslations('authShell.hero');

  return (
    <PageContainer
      className="flex min-h-screen items-center py-8 md:py-12"
      size="immersive"
    >
      <div className="grid w-full gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,430px)] md:gap-6">
        <PageReveal className="hidden md:block">
          <SectionCard
            className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden md:flex"
            hoverLift={false}
            padding="comfortable"
            surface="hero"
          >
            <div className="absolute -top-16 -right-20 size-56 rounded-full bg-primary/15 blur-2xl" />
            <div className="absolute -bottom-20 left-0 size-60 rounded-full bg-surface-strong/20 blur-2xl" />

            <div className="relative z-10">
              <p className="ui-meta ui-couple-mark">{t('eyebrow')}</p>
              <h1 className="ui-display mt-4 max-w-xl">{title}</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {t('description')}
              </p>
            </div>
            <div className="relative z-10 max-w-md rounded-[1.8rem] border border-white/70 bg-[rgba(255,255,255,0.7)] px-5 py-5 shadow-whisper backdrop-blur-md">
              <p className="ui-meta">{t('noteLabel')}</p>
              <p className="mt-3 font-display text-[1.5rem] leading-[1.32] tracking-[-0.02em] text-foreground">
                {helper}
              </p>
            </div>
          </SectionCard>
        </PageReveal>
        <PageReveal delay={0.05}>
          <SectionCard
            className="mx-auto flex w-full max-w-md flex-col gap-6 md:justify-center"
            hoverLift={false}
            padding="comfortable"
            surface="glass"
          >
            <div className="flex flex-col gap-2">
              <p className="ui-meta ui-couple-mark">{helperTitle}</p>
              <h2 className="ui-page-title">{title}</h2>
              <p className="ui-page-description">{helper}</p>
            </div>
            {children}
          </SectionCard>
        </PageReveal>
      </div>
    </PageContainer>
  );
};
