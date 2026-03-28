import Link from "next/link";
import type { ReactElement } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/ui/section-card";

export default function NotFound(): ReactElement {
  return (
    <main className="flex min-h-screen items-center">
      <PageContainer size="sm">
        <SectionCard className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center" padding="comfortable">
          <h1 className="ui-page-title">Page not found</h1>
          <p className="text-sm text-muted-foreground">This page does not exist.</p>
          <Link className="text-sm font-semibold text-primary" href="/home">
            Back home
          </Link>
        </SectionCard>
      </PageContainer>
    </main>
  );
}
