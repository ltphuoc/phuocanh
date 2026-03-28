import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { AcceptInviteForm } from "@/components/forms/accept-invite-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { SectionCard } from "@/components/ui/section-card";
import { getAuthGateState } from "@/lib/server/couple-context";

interface AcceptInvitePageProps {
  readonly searchParams: Promise<{
    readonly token?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Accept Invite | PhuocAnh",
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps): Promise<ReactElement> {
  const state = await getAuthGateState();
  if (state.status === "unauthenticated") {
    redirect("/login");
  }

  if (state.status === "ready") {
    redirect("/home");
  }

  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main>
      <AuthShell
        helper="Accept your partner invite link to join the shared space."
        helperTitle="Accept invite"
        title="Join your couple space"
      >
        {token ? (
          <AcceptInviteForm initialToken={token} />
        ) : (
          <SectionCard className="text-sm text-muted-foreground" surface="petal">
            Missing token. Open the full invite URL.
          </SectionCard>
        )}
        <Link
          className="text-xs font-semibold text-muted-foreground underline decoration-primary/70 underline-offset-2"
          href="/login"
        >
          Back to login
        </Link>
      </AuthShell>
    </main>
  );
}
