"use client";

import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { SectionCard } from "@/components/ui/section-card";
import { useI18n } from "@/hooks/useI18n";

interface QueryErrorStateProps {
  readonly onRetry: () => void;
}

export const QueryLoadingState = (): ReactElement => {
  const { t } = useI18n("loading");

  return (
    <LoadingState
      description={t("description")}
      title={t("title")}
    />
  );
};

export const QueryErrorState = ({
  onRetry,
}: QueryErrorStateProps): ReactElement => {
  const { t } = useI18n("errors");

  return (
    <SectionCard className="flex flex-col gap-4" padding="comfortable" tone="muted">
      <div className="space-y-2">
        <h2 className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
          {t("genericTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("genericDescription")}
        </p>
      </div>
      <Button className="w-full md:w-auto" onClick={onRetry} type="button" variant="outline">
        {t("tryAgain")}
      </Button>
    </SectionCard>
  );
};
