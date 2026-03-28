import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ChatThreadPreview } from "@/components/ui/chat-thread-preview";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";

export const metadata: Metadata = {
  title: "Chat | PhuocAnh",
};

export default function ChatPage(): ReactElement {
  return (
    <ShellPage
      description="A warm conversation canvas for the two of you, designed to feel private and unhurried."
      eyebrow="Private thread"
      quote="The thread should feel like passing little keepsakes back and forth."
      title="Chat"
    >
      <PageReveal>
        <ChatThreadPreview />
      </PageReveal>
      <PageReveal delay={0.08}>
        <SectionCard className="text-sm leading-relaxed text-muted-foreground" surface="paper">
          This is a designed conversation surface for the upcoming chat feature. Real messages,
          presence, and media attachments are intentionally not wired yet.
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
