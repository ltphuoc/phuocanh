import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface LoginPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
  readonly searchParams: Promise<{
    readonly next?: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: LoginPageProps): Promise<Metadata> => getRouteMetadata(params, "login");

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const { next } = await searchParams;
  const t = await getTranslations({
    locale,
    namespace: "auth.login",
  });

  return (
    <main>
      <AuthShell
        helper={t("helper")}
        helperTitle={t("helperTitle")}
        title={t("title")}
      >
        <LoginForm initialNextPath={next} />
        <p className="text-xs text-muted-foreground">
          {t.rich("inviteHint", {
            link: (chunks) => (
              <Link
                className="font-semibold underline decoration-primary/70 underline-offset-2"
                href="/accept-invite"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </AuthShell>
    </main>
  );
}
