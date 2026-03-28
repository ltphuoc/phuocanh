import { format, parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getMemoryDetailData } from "@/lib/server/phase-one-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MemoryDetailPageProps {
  readonly params: Promise<{
    readonly memoryId: string;
  }>;
}

export const metadata: Metadata = {
  title: "Memory Detail | PhuocAnh",
};

export default async function MemoryDetailPage({
  params,
}: MemoryDetailPageProps): Promise<ReactElement> {
  const context = await getReadyCoupleContextOrRedirect();
  const { memoryId } = await params;
  const memory = await getMemoryDetailData(context, memoryId);
  if (!memory) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const mediaUrls = await Promise.all(
    memory.media.map(async (media) => {
      const { data, error } = await supabase.storage
        .from("memory-media")
        .createSignedUrl(media.storagePath, 60 * 15);

      return {
        ...media,
        signedUrl: error || !data?.signedUrl ? null : data.signedUrl,
      };
    }),
  );

  const firstLine = memory.note?.trim().split("\n")[0] ?? "A saved chapter";

  return (
    <PageContainer className="pb-8" size="reading">
      <SectionStack>
        <PageReveal>
          <PageHeader
            action={
              <Link
                className="inline-flex items-center rounded-pill border border-white/70 bg-white/68 px-5 py-3 text-sm font-semibold text-foreground shadow-whisper"
                href="/home"
              >
                Back home
              </Link>
            }
            description={format(parseISO(memory.happenedAt), "MMMM d, yyyy 'at' HH:mm")}
            eyebrow="Saved chapter"
            quote={memory.note?.trim() ? firstLine : undefined}
            surface="hero"
            title={memory.locationName ?? "Memory detail"}
          />
        </PageReveal>

        <PageReveal delay={0.06}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
            <div className="space-y-3">
              <p className="ui-meta">Story note</p>
              <p className="font-display text-[2rem] leading-[1.28] tracking-[-0.03em] text-foreground">
                {memory.note?.trim() || "No note was added for this chapter yet."}
              </p>
            </div>
            {memory.locationName ? (
              <div className="rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
                {memory.locationName}
              </div>
            ) : null}
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.1}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
            <div>
              <p className="ui-meta">Attached media</p>
              <h2 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
                Visual keepsakes
              </h2>
            </div>
            <div className="grid gap-4">
              {mediaUrls.length ? (
                mediaUrls.map((media) =>
                  media.signedUrl ? (
                    media.mediaType === "image" ? (
                      <div
                        className="overflow-hidden rounded-[1.8rem] border border-white/70 shadow-cloud"
                        key={media.id}
                      >
                        <Image
                          alt="Memory media"
                          className="h-auto w-full object-cover"
                          height={900}
                          src={media.signedUrl}
                          unoptimized
                          width={1600}
                        />
                      </div>
                    ) : (
                      <video
                        className="w-full rounded-[1.8rem] border border-white/70 shadow-cloud"
                        controls
                        key={media.id}
                        preload="metadata"
                        src={media.signedUrl}
                      />
                    )
                  ) : (
                    <EmptyState
                      className="h-full"
                      description="Signed URL is unavailable for this media."
                      key={media.id}
                      title="Could not load preview"
                    />
                  ),
                )
              ) : (
                <EmptyState
                  description="No image or video was attached to this memory."
                  title="No media yet"
                />
              )}
            </div>
          </SectionCard>
        </PageReveal>
      </SectionStack>
    </PageContainer>
  );
}
