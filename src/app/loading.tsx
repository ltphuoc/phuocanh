import type { ReactElement } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/ui/loading-state";
import { SectionCard } from "@/components/ui/section-card";

export default function GlobalLoading(): ReactElement {
  return (
    <main className="flex min-h-screen items-center">
      <PageContainer size="sm">
        <SectionCard className="mx-auto w-full max-w-md" padding="comfortable">
          <LoadingState />
        </SectionCard>
      </PageContainer>
    </main>
  );
}
