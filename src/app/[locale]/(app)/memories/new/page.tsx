import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { CreateMemoryForm } from "@/components/forms/create-memory-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface NewMemoryPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: NewMemoryPageProps): Promise<Metadata> => getRouteMetadata(params, "addMemory");

export default async function NewMemoryPage({
  params,
}: NewMemoryPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: "newMemory",
  });

  return (
    <main className="mx-auto w-full max-w-4xl">
      <SectionStack>
        <PageHeader
          description={t("header.description")}
          eyebrow={t("header.eyebrow")}
          title={t("header.title")}
        />
        <SectionCard className="flex flex-col gap-4" padding="comfortable">
          <CreateMemoryForm />
        </SectionCard>
      </SectionStack>
    </main>
  );
}
