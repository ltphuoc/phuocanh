import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ChatThreadPreview } from "@/components/ui/chat-thread-preview";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface ChatPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: ChatPageProps): Promise<Metadata> => getRouteMetadata(params, "chat");

export default async function ChatPage({
  params,
}: ChatPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: "chat",
  });

  return (
    <ShellPage
      description={t("header.description")}
      eyebrow={t("header.eyebrow")}
      quote={t("header.quote")}
      title={t("header.title")}
    >
      <PageReveal>
        <ChatThreadPreview />
      </PageReveal>
      <PageReveal delay={0.08}>
        <SectionCard className="text-sm leading-relaxed text-muted-foreground" surface="paper">
          {t("note")}
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
