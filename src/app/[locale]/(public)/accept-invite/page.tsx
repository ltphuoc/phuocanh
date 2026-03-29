import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { AcceptInviteForm } from "@/components/forms/accept-invite-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getAuthGateState } from "@/lib/server/couple-context";

interface AcceptInvitePageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
  readonly searchParams: Promise<{
    readonly token?: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: AcceptInvitePageProps): Promise<Metadata> => getRouteMetadata(params, "acceptInvite");

export default async function AcceptInvitePage({
  params,
  searchParams,
}: AcceptInvitePageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [t, commonT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "auth.acceptInvite",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
  ]);

  const state = await getAuthGateState();
  if (state.status === "unauthenticated") {
    redirect({
      href: "/login",
      locale,
    });
  }

  if (state.status === "ready") {
    redirect({
      href: "/home",
      locale,
    });
  }

  const queryParams = await searchParams;
  const token = queryParams.token ?? "";

  return (
    <main>
      <AuthShell
        helper={t("helper")}
        helperTitle={t("helperTitle")}
        title={t("title")}
      >
        {token ? (
          <AcceptInviteForm initialToken={token} />
        ) : (
          <SectionCard className="text-sm text-muted-foreground" surface="petal">
            {t("missingTokenDescription")}
          </SectionCard>
        )}
        <Link
          className="text-xs font-semibold text-muted-foreground underline decoration-primary/70 underline-offset-2"
          href="/login"
        >
          {commonT("backToLogin")}
        </Link>
      </AuthShell>
    </main>
  );
}
