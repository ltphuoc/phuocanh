'use client';

import type { ReactElement } from 'react';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';

import { hasLocale, useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { localeDisplayNames, routing } from '@/i18n/routing';
import { cn } from '@/lib/utils/cn';

interface LanguageSwitcherProps {
  readonly className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps): ReactElement => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const rawLocale = useLocale();
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = useTranslations('languageSwitcher');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-white/72 bg-white/72 p-1 shadow-whisper',
        className,
      )}
    >
      <span className="sr-only">{t('label')}</span>
      {routing.locales.map((targetLocale) => {
        const isActive = locale === targetLocale;

        return (
          <button
            className={cn(
              'rounded-pill px-3 py-1.5 text-2xs font-semibold tracking-meta uppercase transition-colors',
              isActive
                ? 'ui-gradient-active text-primary-foreground'
                : 'text-muted-foreground hover:bg-white/70',
            )}
            disabled={isPending || isActive}
            key={targetLocale}
            onClick={() => {
              startTransition(() => {
                const queryString = searchParams.toString();
                const nextPath = queryString ? `${pathname}?${queryString}` : pathname;
                router.replace(nextPath, {
                  locale: targetLocale,
                });
              });
            }}
            type="button"
          >
            {localeDisplayNames[targetLocale]}
          </button>
        );
      })}
    </div>
  );
};
