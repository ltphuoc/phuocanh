"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactElement } from "react";
import {
  appMemoryActionItem,
  appMobileNavigationItems,
  appMoreNavigationItem,
  isAppNavigationItemActive,
} from "@/components/app/navigation-model";
import { MoreNavigationSheet } from "@/components/app/more-navigation-sheet";
import { cn } from "@/lib/utils/cn";

interface MoreSheetState {
  readonly open: boolean;
  readonly pathname: string;
}

export const BottomNavigation = (): ReactElement => {
  const pathname = usePathname();
  const [moreSheetState, setMoreSheetState] = useState<MoreSheetState>({
    open: false,
    pathname,
  });
  const MemoryActionIcon = appMemoryActionItem.icon;
  const isMoreOpen =
    moreSheetState.pathname === pathname ? moreSheetState.open : false;

  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-40 flex justify-center md:hidden">
        <LayoutGroup id="mobile-dock">
          <div className="pointer-events-auto relative w-[min(92vw,420px)]">
            <div className="absolute inset-x-[calc(50%-36px)] -top-7 flex justify-center">
              <Link
                className="ui-gradient-active inline-flex size-[72px] items-center justify-center rounded-full border border-white/70 text-primary-foreground shadow-cloud"
                href={appMemoryActionItem.href}
              >
                <MemoryActionIcon aria-hidden="true" className="size-7" strokeWidth={2.1} />
              </Link>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)_minmax(0,1fr)] items-end rounded-full border border-white/70 bg-[rgba(255,249,242,0.74)] px-3 py-3 shadow-cloud backdrop-blur-xl">
              {appMobileNavigationItems.map((item, index) => {
                const active = isAppNavigationItemActive(pathname, item);
                const Icon = item.icon;
                const isMoreItem = item.href === appMoreNavigationItem.href;
                const columnClass = index >= 2 ? "col-start-[4]" : "";
                const content = (
                  <>
                    {active ? (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-[rgba(255,255,255,0.88)] shadow-whisper"
                        layoutId="mobile-dock-active"
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null}
                    <span className="relative flex flex-col items-center gap-1">
                      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2.2} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                        {item.mobileLabel ?? item.label}
                      </span>
                    </span>
                  </>
                );

                return (
                  <div className={cn(columnClass, "flex justify-center")} key={item.href}>
                    {isMoreItem ? (
                      <button
                        className={cn(
                          "relative flex min-w-[72px] items-center justify-center rounded-full px-2 py-2.5",
                          active || isMoreOpen
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                        onClick={() =>
                          setMoreSheetState({
                            open: !isMoreOpen,
                            pathname,
                          })
                        }
                        type="button"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        className={cn(
                          "relative flex min-w-[72px] items-center justify-center rounded-full px-2 py-2.5",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                        href={item.href}
                      >
                        {content}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none mt-3 text-center text-[11px] font-medium text-muted-foreground">
              Capture a moment
            </div>
          </div>
        </LayoutGroup>
      </nav>
      <MoreNavigationSheet
        activeHref={pathname}
        onClose={() =>
          setMoreSheetState({
            open: false,
            pathname,
          })
        }
        open={isMoreOpen}
      />
    </>
  );
};
