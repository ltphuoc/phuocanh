import { ClipboardList, Flower2, Heart, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ChecklistItemForm } from "@/components/forms/checklist-item-form";
import { ChecklistToggleForm } from "@/components/forms/checklist-toggle-form";
import { CreateChecklistForm } from "@/components/forms/create-checklist-form";
import { InviteLinkForm } from "@/components/forms/invite-link-form";
import { WishItemForm } from "@/components/forms/wish-item-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { AnniversarySpotlight } from "@/components/ui/anniversary-spotlight";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { TimelineRibbon, type TimelineRibbonItem } from "@/components/ui/timeline-ribbon";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { signMemoryMediaStorageItems } from "@/lib/server/memory-media";
import { getHomePageData } from "@/lib/server/phase-one-data";

interface MemoryPreview {
  readonly id: string;
  readonly imageUrl: string | null;
}

interface HomePageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: HomePageProps): Promise<Metadata> => getRouteMetadata(params, "home");

const categoryTranslationKeyByValue = {
  food: "category.food",
  movie: "category.movie",
  place: "category.place",
} as const;

export default async function HomePage({
  params,
}: HomePageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [homeT, wishItemFormT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "home",
    }),
    getTranslations({
      locale,
      namespace: "forms.wishItem",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const data = await getHomePageData(context);

  const signedMemoryPreviews = await signMemoryMediaStorageItems(
    data.memories.map((memory) => ({
      id: memory.id,
      mediaType: memory.mediaType,
      storagePath: memory.storagePath,
    })),
  );
  const memoryPreviews: readonly MemoryPreview[] = signedMemoryPreviews.map((memory) => ({
    id: memory.id,
    imageUrl: memory.mediaType === "image" ? memory.signedUrl : null,
  }));

  const memoryPreviewMap = new Map<string, string | null>();
  memoryPreviews.forEach((preview) => {
    memoryPreviewMap.set(preview.id, preview.imageUrl);
  });

  const timelineItems: readonly TimelineRibbonItem[] = data.memories.map((memory) => ({
    happenedAt: memory.happenedAt,
    href: `/memories/${memory.id}`,
    id: memory.id,
    imageUrl: memoryPreviewMap.get(memory.id) ?? null,
    locationName: memory.locationName,
    mediaType: memory.mediaType,
    note: memory.note,
    timeZone: context.timezone,
  }));

  const featuredMemory = data.memories[0]
    ? {
        happenedAt: data.memories[0].happenedAt,
        href: `/memories/${data.memories[0].id}`,
        imageUrl: memoryPreviewMap.get(data.memories[0].id) ?? null,
        locationName: data.memories[0].locationName,
        mediaType: data.memories[0].mediaType,
        note: data.memories[0].note,
        timeZone: context.timezone,
      }
    : null;

  return (
    <main className="pb-6">
      <SectionStack>
        <PageReveal>
          <AnniversarySpotlight
            coupleStartedAt={context.coupleStartedAt}
            featuredMemory={featuredMemory}
            relationshipDays={data.relationshipDays}
            timeZone={context.timezone}
          />
        </PageReveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <PageReveal delay={0.05}>
            <section className="flex flex-col gap-6">
              <PageHeader
                action={
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="ui-gradient-active inline-flex items-center rounded-pill px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cloud"
                      href="/memories/new"
                    >
                      {homeT("addMemory")}
                    </Link>
                    <InviteLinkForm />
                  </div>
                }
                description={homeT("header.description")}
                eyebrow={homeT("header.eyebrow")}
                quote={homeT("header.quote")}
                surface="paper"
                title={homeT("header.title")}
              />
              {timelineItems.length ? (
                <TimelineRibbon items={timelineItems} timeZone={context.timezone} />
              ) : (
                <EmptyState
                  description={homeT("timelineEmpty.description")}
                  icon={<Flower2 aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                  title={homeT("timelineEmpty.title")}
                />
              )}
            </section>
          </PageReveal>

          <div className="flex flex-col gap-6">
            <PageReveal delay={0.1}>
              <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-meta ui-couple-mark">{homeT("wishlist.eyebrow")}</p>
                    <h2 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
                      {homeT("wishlist.title")}
                    </h2>
                  </div>
                  <Sparkles aria-hidden="true" className="size-5 text-primary" strokeWidth={2.2} />
                </div>
                <WishItemForm />
                <div className="flex flex-col gap-3">
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
                      description={homeT("wishlist.empty.description")}
                      icon={<Heart aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                      title={homeT("wishlist.empty.title")}
                    />
                  )}
                </div>
              </SectionCard>
            </PageReveal>

            <PageReveal delay={0.15}>
              <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="petal">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-meta ui-couple-mark">{homeT("checklists.eyebrow")}</p>
                    <h2 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
                      {homeT("checklists.title")}
                    </h2>
                  </div>
                  <ClipboardList aria-hidden="true" className="size-5 text-primary" strokeWidth={2.2} />
                </div>
                <CreateChecklistForm />
                <div className="flex flex-col gap-4">
                  {data.checklists.length ? (
                    data.checklists.map((checklist) => (
                      <SectionCard
                        className="flex flex-col gap-4"
                        hoverLift={false}
                        key={checklist.id}
                        padding="compact"
                        surface="paper"
                      >
                        <div>
                          <p className="ui-meta">{homeT("checklists.sectionLabel")}</p>
                          <h3 className="mt-2 font-display text-[1.45rem] tracking-[-0.02em] text-foreground">
                            {checklist.title}
                          </h3>
                        </div>
                        <div className="flex flex-col gap-3">
                          {checklist.items.map((item) => (
                            <ListRow
                              action={<ChecklistToggleForm checklistItemId={item.id} isDone={item.isDone} />}
                              key={item.id}
                              subtitle={item.isDone ? homeT("checklists.completed") : homeT("checklists.pending")}
                              title={item.text}
                            />
                          ))}
                        </div>
                        <ChecklistItemForm checklistId={checklist.id} />
                      </SectionCard>
                    ))
                  ) : (
                    <EmptyState
                      description={homeT("checklists.empty.description")}
                      icon={<ClipboardList aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                      title={homeT("checklists.empty.title")}
                    />
                  )}
                </div>
              </SectionCard>
            </PageReveal>
          </div>
        </div>
      </SectionStack>
    </main>
  );
}
