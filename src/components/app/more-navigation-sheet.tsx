"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { ReactElement } from "react";
import {
  appSecondaryNavigationItems,
  isAppNavigationItemActive,
  type AppNavigationItem,
} from "@/components/app/navigation-model";
import { cn } from "@/lib/utils/cn";

interface MoreNavigationSheetProps {
  readonly activeHref: string;
  readonly onClose: () => void;
  readonly open: boolean;
}

interface NavigationGroup {
  readonly items: readonly AppNavigationItem[];
  readonly name: string;
}

const groupNavigationItems = (
  items: readonly AppNavigationItem[],
): readonly NavigationGroup[] => {
  const groups = new Map<string, AppNavigationItem[]>();

  items.forEach((item) => {
    const groupName = item.group ?? "More";
    const existingItems = groups.get(groupName) ?? [];
    groups.set(groupName, [...existingItems, item]);
  });

  return Array.from(groups.entries()).map(([name, groupedItems]) => ({
    items: groupedItems,
    name,
  }));
};

const groupedSecondaryItems = groupNavigationItems(appSecondaryNavigationItems);

export const MoreNavigationSheet = ({
  activeHref,
  onClose,
  open,
}: MoreNavigationSheetProps): ReactElement => (
  <AnimatePresence>
    {open ? (
      <div className="fixed inset-0 z-50 md:hidden">
        <motion.button
          animate={{ opacity: 1 }}
          aria-label="Close navigation sheet"
          className="absolute inset-0 bg-[rgba(75,55,66,0.14)] backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-4 bottom-4 rounded-[var(--radius-hero)] border border-white/70 bg-[rgba(255,249,242,0.92)] px-5 py-5 shadow-cloud backdrop-blur-xl"
          exit={{ opacity: 0, y: 18 }}
          initial={{ opacity: 0, y: 24 }}
          transition={{ damping: 28, stiffness: 280, type: "spring" }}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="ui-meta ui-couple-mark">More places</p>
              <h2 className="mt-2 font-display text-[1.8rem] tracking-[-0.035em] text-foreground">
                Shared corners
              </h2>
            </div>
            <button
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/72 bg-white/72 text-xs font-semibold uppercase tracking-[0.08em] text-foreground shadow-whisper"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
          <div className="flex max-h-[65svh] flex-col gap-5 overflow-y-auto pb-2">
            {groupedSecondaryItems.map((group) => (
              <div className="flex flex-col gap-3" key={group.name}>
                <p className="ui-meta">{group.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isAppNavigationItemActive(activeHref, item);

                    return (
                      <Link
                        className={cn(
                          "rounded-[1.4rem] border px-4 py-3 shadow-whisper transition-transform hover:-translate-y-0.5",
                          isActive
                            ? "border-primary/20 bg-primary/14"
                            : "border-white/72 bg-white/72",
                        )}
                        href={item.href}
                        key={item.href}
                        onClick={onClose}
                      >
                        <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-[rgba(255,227,225,0.84)] text-primary">
                          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2.1} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {item.description}
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
