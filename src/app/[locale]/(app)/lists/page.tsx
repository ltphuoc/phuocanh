import { ClipboardList, HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getHomePageData } from "@/lib/server/phase-one-data";

interface ListsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

const categoryTranslationKeyByValue = {
  food: "category.food",
  movie: "category.movie",
  place: "category.place",
} as const;

export const generateMetadata = async ({
  params,
}: ListsPageProps): Promise<Metadata> => getRouteMetadata(params, "lists");

export default async function ListsPage({
  params,
}: ListsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [listsT, wishItemFormT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "lists",
    }),
    getTranslations({
      locale,
      namespace: "forms.wishItem",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const data = await getHomePageData(context);

  return (
    <main>
      <SectionStack>
        <PageHeader
          description={listsT("header.description")}
          eyebrow={listsT("header.eyebrow")}
          title={listsT("header.title")}
        />

        <ResponsiveGrid columns={2}>
          <SectionCard className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{listsT("wishItems.title")}</h2>
            <WishItemForm />
            <div className="flex flex-col gap-2">
              {data.wishItems.length ? (
                data.wishItems.map((item) => (
                  <ListRow
                    key={item.id}
                    meta={<Badge>{wishItemFormT(categoryTranslationKeyByValue[item.category])}</Badge>}
                    subtitle={item.note}
                    title={item.title}
                  />
                ))
              ) : (
                <EmptyState
                  description={listsT("wishItems.empty.description")}
                  icon={<HeartHandshake aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                  title={listsT("wishItems.empty.title")}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{listsT("checklists.title")}</h2>
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
                          subtitle={item.isDone ? listsT("checklists.completed") : listsT("checklists.pending")}
                          title={item.text}
                        />
                      ))}
                    </div>
                    <ChecklistItemForm checklistId={checklist.id} />
                  </SectionCard>
                ))
              ) : (
                <EmptyState
                  description={listsT("checklists.empty.description")}
                  icon={<ClipboardList aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                  title={listsT("checklists.empty.title")}
                />
              )}
            </div>
          </SectionCard>
        </ResponsiveGrid>
      </SectionStack>
    </main>
  );
}
