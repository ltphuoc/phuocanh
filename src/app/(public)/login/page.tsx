import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export const metadata: Metadata = {
  title: "Login | PhuocAnh",
};

export default function LoginPage(): ReactElement {
  return (
    <main>
      <AuthShell
        helper="Use your magic link to continue back into your private couple keepsake space."
        helperTitle="Sign in"
        title="Welcome back"
      >
        <LoginForm />
        <p className="text-xs text-muted-foreground">
          If this is your second account, ask your partner for an invite link and open{" "}
          <Link
            className="font-semibold underline decoration-primary/70 underline-offset-2"
            href="/accept-invite"
          >
            accept invite
          </Link>
          .
        </p>
      </AuthShell>
    </main>
  );
}
