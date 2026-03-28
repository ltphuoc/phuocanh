import { CalendarClock, Lock } from "lucide-react";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { ListRow } from "@/components/ui/list-row";
import { SectionCard } from "@/components/ui/section-card";

export const metadata: Metadata = {
  title: "Future Notes | PhuocAnh",
};

export default function FutureNotesPage(): ReactElement {
  return (
    <ShellPage
      description="Write notes now and unlock them together at a chosen future date."
      eyebrow="Capsules"
      title="Future notes"
    >
      <SectionCard className="flex flex-col gap-3" padding="comfortable">
        <ListRow
          action={<Lock aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={2.1} />}
          subtitle="Unlocks on Nov 12, 2026"
          title="For our anniversary"
        />
        <ListRow
          action={
            <CalendarClock
              aria-hidden="true"
              className="size-4 text-muted-foreground"
              strokeWidth={2.1}
            />
          }
          subtitle="Unlocks on Jan 01, 2027"
          title="Message for our future selves"
        />
      </SectionCard>

      <ComingSoonCard
        ctaHref="/countdowns"
        ctaLabel="Open countdown shell"
        description="Real encrypted note entries and unlock jobs will be connected once the future-note backend model is delivered."
        title="Unlock workflow"
      />
    </ShellPage>
  );
}
