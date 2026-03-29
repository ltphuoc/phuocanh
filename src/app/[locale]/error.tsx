"use client";

import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  isSchemaReadinessErrorMessage,
  localSchemaRecoverySteps,
} from "@/lib/errors";

interface GlobalErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps): ReactElement {
  const t = useTranslations("errors");
  const isSchemaSetupIssue = isSchemaReadinessErrorMessage(error.message);

  return (
    <main className="flex min-h-screen items-center">
      <PageContainer size="sm">
        <SectionCard className="mx-auto flex w-full max-w-lg flex-col gap-4" padding="comfortable">
          <h1 className="ui-page-title">
            {isSchemaSetupIssue ? t("databaseSetupRequired") : t("genericTitle")}
          </h1>
          {isSchemaSetupIssue ? (
            <div className="rounded-2xl border border-border/80 bg-muted-soft px-4 py-3 text-sm text-muted-foreground">
              <p>{t("schemaCommandsDescription")}</p>
              <ol className="mt-2 list-decimal pl-5">
                {localSchemaRecoverySteps.map((command) => (
                  <li key={command}>
                    <code>{command}</code>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("genericDescription")}</p>
          )}
          <Button className="w-full md:w-auto" onClick={reset} variant="outline">
            {t("tryAgain")}
          </Button>
        </SectionCard>
      </PageContainer>
    </main>
  );
}
