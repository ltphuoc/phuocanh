'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/app/language-switcher';
import {
  appMemoryActionItem,
  appPrimaryNavigationItems,
  appSecondaryNavigationItems,
  isAppNavigationItemActive,
} from '@/components/app/navigation-model';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

interface ExpansionState {
  readonly open: boolean;
  readonly pathname: string;
}

export const SideNavigation = (): ReactElement => {
  const pathname = usePathname();
  const t = useTranslations();
  const MemoryActionIcon = appMemoryActionItem.icon;
  const hasSecondaryActive = appSecondaryNavigationItems.some((item) =>
    isAppNavigationItemActive(pathname, item),
  );
  const [expansionState, setExpansionState] = useState<ExpansionState>(() => ({
    open: hasSecondaryActive,
    pathname,
  }));
  const isExpanded =
    expansionState.pathname === pathname ? expansionState.open : hasSecondaryActive;

  return (
    <aside className="hidden shrink-0 md:block">
      <LayoutGroup id="desktop-rail">
        <div className="sticky top-6 flex items-start gap-3">
          <motion.div
            className="flex w-[92px] flex-col items-center gap-4 rounded-[2.25rem] border border-white/62 bg-[rgba(255,249,242,0.64)] p-4 shadow-cloud backdrop-blur-xl"
            layout
          >
            <Link
              className="ui-gradient-hero flex size-[60px] items-center justify-center rounded-[1.7rem] border border-white/62 text-center shadow-whisper"
              href="/home"
            >
              <span className="font-display text-lg tracking-[-0.04em] text-foreground">
                P<span className="text-primary">&</span>A
              </span>
            </Link>
            <div className="text-center">
              <p className="ui-meta">PhuocAnh</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t('nav.side.keepsakeSpace')}
              </p>
            </div>
            <nav className="flex w-full flex-col items-center gap-3">
              {appPrimaryNavigationItems.map((item) => {
                const active = isAppNavigationItemActive(pathname, item);
                const Icon = item.icon;

                return (
                  <Link
                    className={cn(
                      'relative flex size-14 items-center justify-center rounded-full',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {active ? (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-white/86 shadow-whisper"
                        layoutId="desktop-rail-active"
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null}
                    <Icon
                      aria-hidden="true"
                      className="relative size-5"
                      strokeWidth={2.1}
                    />
                    <span className="sr-only">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>
            <Link
              className="ui-gradient-active mt-1 inline-flex size-[58px] items-center justify-center rounded-full border border-white/70 text-primary-foreground shadow-cloud"
              href={appMemoryActionItem.href}
            >
              <MemoryActionIcon
                aria-hidden="true"
                className="size-6"
                strokeWidth={2.1}
              />
            </Link>
            <LanguageSwitcher />
            <button
              className={cn(
                'mt-auto inline-flex size-12 items-center justify-center rounded-full border border-white/66 bg-white/72 shadow-whisper',
                isExpanded ? 'text-foreground' : 'text-muted-foreground',
              )}
              onClick={() =>
                setExpansionState({
                  open: !isExpanded,
                  pathname,
                })
              }
              type="button"
            >
              <span className="sr-only">{t('nav.side.toggleNavigation')}</span>
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 7H20M4 12H15M4 17H12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </motion.div>
          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="w-[240px] rounded-[2rem] border border-white/62 bg-[rgba(255,249,242,0.72)] p-5 shadow-cloud backdrop-blur-xl"
                exit={{ opacity: 0, x: -12 }}
                initial={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4">
                  <p className="ui-meta ui-couple-mark">{t('nav.side.sharedCornersEyebrow')}</p>
                  <p className="mt-2 font-display text-[1.75rem] tracking-[-0.03em] text-foreground">
                    {t('nav.side.sharedCornersTitle')}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {appSecondaryNavigationItems.map((item) => {
                    const active = isAppNavigationItemActive(pathname, item);
                    const Icon = item.icon;

                    return (
                      <Link
                        className={cn(
                          'rounded-[1.4rem] border px-4 py-3 shadow-whisper transition-transform hover:-translate-y-0.5',
                          active
                            ? 'border-primary/20 bg-primary/14'
                            : 'border-white/70 bg-white/70',
                        )}
                        href={item.href}
                        key={item.href}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex size-10 items-center justify-center rounded-full bg-[rgba(255,227,225,0.82)] text-primary">
                            <Icon
                              aria-hidden="true"
                              className="size-[18px]"
                              strokeWidth={2.1}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {t(item.labelKey)}
                            </span>
                            {item.descriptionKey ? (
                              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                {t(item.descriptionKey)}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </aside>
  );
};
