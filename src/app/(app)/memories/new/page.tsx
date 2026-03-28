import type { Metadata } from "next";
import type { ReactElement } from "react";
import { CreateMemoryForm } from "@/components/forms/create-memory-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { SectionCard } from "@/components/ui/section-card";

export const metadata: Metadata = {
  title: "Add Memory | PhuocAnh",
};

export default function NewMemoryPage(): ReactElement {
  return (
    <main className="mx-auto w-full max-w-4xl">
      <SectionStack>
        <PageHeader
          description="Save a moment with note, photo, or short video."
          eyebrow="Timeline"
          title="Add memory"
        />
        <SectionCard className="flex flex-col gap-4" padding="comfortable">
          <CreateMemoryForm />
        </SectionCard>
      </SectionStack>
    </main>
  );
}
