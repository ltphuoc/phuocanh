'use client';

import type { ReactElement } from 'react';
import type { AppNavigationItem } from '@/components/app/navigation-model';

import { useEffect, useRef } from 'react';

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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without re-running the focus-trap effect on every parent render.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // While open: store the trigger, move focus into the sheet, trap Tab, handle Escape;
  // on close, restore focus to the element that opened the sheet.
  useEffect(() => {
    if (!open) {
      return;
    }

    triggerRef.current = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = (): HTMLElement[] =>
      sheet ? Array.from(sheet.querySelectorAll<HTMLElement>(focusableSelector)) : [];

    (getFocusable()[0] ?? sheet)?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseRef.current();

        return;
      }

      if (event.key !== 'Tab' || !sheet) {
        return;
      }

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        sheet.focus();

        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      const active = document.activeElement;

      if (event.shiftKey && (active === first || !sheet.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if the trigger is still in the document.
      if (triggerRef.current && document.contains(triggerRef.current)) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 overscroll-contain md:hidden">
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={t('nav.moreSheet.closeAriaLabel')}
            className="absolute inset-0 bg-foreground/24 backdrop-blur-sm"
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
            className="absolute inset-x-4 bottom-4 rounded-hero border border-white/70 bg-bg-soft/94 px-5 py-5 shadow-cloud backdrop-blur-xl"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            id={sheetId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            ref={sheetRef}
            role="dialog"
            tabIndex={-1}
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
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/72 bg-white/76 text-xs font-semibold tracking-meta text-foreground uppercase shadow-whisper"
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
                            'rounded-panel border px-4 py-3 shadow-whisper transition-transform hover:-translate-y-0.5 active:translate-y-px',
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
