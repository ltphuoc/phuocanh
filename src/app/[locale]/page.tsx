import { redirect } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { resolveLocaleFromParams } from "@/i18n/server";
import { getAuthGateState } from "@/lib/server/couple-context";

interface IndexPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export default async function IndexPage({
  params,
}: IndexPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const state = await getAuthGateState();

  if (state.status === "unauthenticated") {
    redirect({
      href: "/login",
      locale,
    });
  }

  if (state.status === "needs_invite") {
    redirect({
      href: "/accept-invite",
      locale,
    });
  }

  redirect({
    href: "/home",
    locale,
  });

  return <></>;
}
