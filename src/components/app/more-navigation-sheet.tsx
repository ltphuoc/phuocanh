'use client';

import type { ReactElement } from 'react';
import type { AppNavigationItem } from '@/components/app/navigation-model';

import { useEffect } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/app/language-switcher';
import {
  appSecondaryNavigationItems,
  isAppNavigationItemActive,
} from '@/components/app/navigation-model';
import { useHydratedReducedMotion } from '@/hooks/use-hydrated-reduced-motion';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';

interface MoreNavigationSheetProps {
  readonly activeHref: string;
  readonly id?: string;
  readonly onClose: () => void;
  readonly open: boolean;
}

interface NavigationGroup {
  readonly items: readonly AppNavigationItem[];
  readonly nameKey: NonNullable<AppNavigationItem['groupKey']> | 'nav.items.more.label';
}

const groupNavigationItems = (items: readonly AppNavigationItem[]): readonly NavigationGroup[] => {
  const groups = new Map<NavigationGroup['nameKey'], AppNavigationItem[]>();

  items.forEach((item) => {
    const groupName = item.groupKey ?? 'nav.items.more.label';
    const existingItems = groups.get(groupName) ?? [];
    groups.set(groupName, [...existingItems, item]);
  });

  return Array.from(groups.entries()).map(([nameKey, groupedItems]) => ({
    items: groupedItems,
    nameKey,
  }));
};

const groupedSecondaryItems = groupNavigationItems(appSecondaryNavigationItems);

export const MoreNavigationSheet = ({
  activeHref,
  id,
  onClose,
  open,
}: MoreNavigationSheetProps): ReactElement => {
  const t = useTranslations();
  const reduceMotion = useHydratedReducedMotion();
  const sheetId = id ?? 'mobile-more-navigation-sheet';
  const titleId = `${sheetId}-title`;
  const fadeTransition = reduceMotion ? { duration: 0 } : { duration: 0.18 };
  const sheetTransition = reduceMotion
    ? { duration: 0 }
    : { damping: 28, stiffness: 280, type: 'spring' as const };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 overscroll-contain md:hidden">
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={t('nav.moreSheet.closeAriaLabel')}
            className="absolute inset-0 bg-[rgba(75,55,66,0.24)] backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={fadeTransition}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-labelledby={titleId}
            aria-modal="true"
            className="absolute inset-x-4 bottom-4 rounded-[var(--radius-hero)] border border-white/70 bg-[rgba(255,249,242,0.94)] px-5 py-5 shadow-cloud backdrop-blur-xl"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            id={sheetId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            role="dialog"
            transition={sheetTransition}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="ui-meta ui-couple-mark">{t('nav.moreSheet.eyebrow')}</p>
                <h2
                  className="ui-card-title mt-2"
                  id={titleId}
                >
                  {t('nav.moreSheet.title')}
                </h2>
              </div>
              <button
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/72 bg-white/76 text-xs font-semibold tracking-[0.06em] text-foreground uppercase shadow-whisper"
                onClick={onClose}
                type="button"
              >
                {t('nav.moreSheet.done')}
              </button>
            </div>
            <LanguageSwitcher className="mb-5 w-fit" />
            <div className="flex max-h-[65svh] flex-col gap-5 overflow-y-auto overscroll-contain pb-2">
              {groupedSecondaryItems.map((group) => (
                <div
                  className="flex flex-col gap-3"
                  key={group.nameKey}
                >
                  <p className="ui-meta">{t(group.nameKey)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isAppNavigationItemActive(activeHref, item);

                      return (
                        <Link
                          className={cn(
                            'rounded-[var(--radius-panel)] border px-4 py-3 shadow-whisper transition-transform hover:-translate-y-0.5 active:translate-y-px',
                            isActive
                              ? 'border-primary/20 bg-primary/14'
                              : 'border-white/72 bg-white/74',
                          )}
                          href={item.href}
                          key={item.href}
                          onClick={onClose}
                        >
                          <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon
                              aria-hidden="true"
                              className="size-[18px]"
                              strokeWidth={2.1}
                            />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {t(item.labelKey)}
                          </p>
                          {item.descriptionKey ? (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {t(item.descriptionKey)}
                            </p>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
