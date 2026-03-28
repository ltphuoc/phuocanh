import { ClipboardList, HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ChecklistItemForm } from "@/components/forms/checklist-item-form";
import { ChecklistToggleForm } from "@/components/forms/checklist-toggle-form";
import { CreateChecklistForm } from "@/components/forms/create-checklist-form";
import { WishItemForm } from "@/components/forms/wish-item-form";
import { PageHeader } from "@/components/layout/page-header";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { SectionStack } from "@/components/layout/section-stack";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { SectionCard } from "@/components/ui/section-card";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getHomePageData } from "@/lib/server/phase-one-data";

export const metadata: Metadata = {
  title: "Lists | PhuocAnh",
};

export default async function ListsPage(): Promise<ReactElement> {
  const context = await getReadyCoupleContextOrRedirect();
  const data = await getHomePageData(context);

  return (
    <main>
      <SectionStack>
        <PageHeader
          description="Keep your couple plans and todos in one place."
          eyebrow="Planning"
          title="Shared lists"
        />

        <ResponsiveGrid columns={2}>
          <SectionCard className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Wish items</h2>
            <WishItemForm />
            <div className="flex flex-col gap-2">
              {data.wishItems.length ? (
                data.wishItems.map((item) => (
                  <ListRow
                    key={item.id}
                    meta={<Badge>{item.category}</Badge>}
                    subtitle={item.note}
                    title={item.title}
                  />
                ))
              ) : (
                <EmptyState
                  description="Add places, food, or movies you want to try together."
                  icon={<HeartHandshake aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                  title="No wish items yet"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Checklists</h2>
            <CreateChecklistForm />
            <div className="flex flex-col gap-4">
              {data.checklists.length ? (
                data.checklists.map((checklist) => (
                  <SectionCard className="flex flex-col gap-3" key={checklist.id} tone="muted">
                    <h3 className="text-sm font-semibold">{checklist.title}</h3>
                    <div className="flex flex-col gap-2">
                      {checklist.items.map((item) => (
                        <ListRow
                          action={<ChecklistToggleForm checklistItemId={item.id} isDone={item.isDone} />}
                          key={item.id}
                          subtitle={item.isDone ? "Completed" : "Pending"}
                          title={item.text}
                        />
                      ))}
                    </div>
                    <ChecklistItemForm checklistId={checklist.id} />
                  </SectionCard>
                ))
              ) : (
                <EmptyState
                  description="Create a checklist for your next trip or weekend."
                  icon={<ClipboardList aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                  title="No checklists yet"
                />
              )}
            </div>
          </SectionCard>
        </ResponsiveGrid>
      </SectionStack>
    </main>
  );
}
