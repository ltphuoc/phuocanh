import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { BottomNavigation } from "@/components/app/bottom-navigation";
import { SideNavigation } from "@/components/app/side-navigation";
import { getAuthGateState } from "@/lib/server/couple-context";

interface AppLayoutProps {
  readonly children: ReactNode;
}

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<ReactElement> {
  const state = await getAuthGateState();
  if (state.status === "unauthenticated") {
    redirect("/login");
  }

  if (state.status === "needs_invite") {
    redirect("/accept-invite");
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-5 pb-32 pt-5 md:px-7 md:pb-12 md:pt-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden">
        <div className="absolute left-[-8%] top-10 size-64 rounded-full bg-[rgba(255,209,209,0.34)] blur-3xl" />
        <div className="absolute right-[-4%] top-[-2%] size-72 rounded-full bg-[rgba(255,148,148,0.16)] blur-3xl" />
      </div>
      <div className="mb-6 rounded-[2rem] border border-white/65 bg-[rgba(255,249,242,0.58)] px-5 py-4 shadow-whisper backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-meta ui-couple-mark">Private chapter</p>
            <p className="mt-2 font-display text-[2rem] tracking-[-0.045em] text-foreground">
              PhuocAnh
            </p>
          </div>
          <Link
            className="inline-flex items-center rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground shadow-whisper"
            href="/memories/new"
          >
            Add memory
          </Link>
        </div>
      </div>
      <div className="flex flex-1 gap-6 lg:gap-8">
        <SideNavigation />
        <div className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
