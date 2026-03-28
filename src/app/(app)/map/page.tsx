import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { PageReveal } from "@/components/ui/page-reveal";
import { TravelAtlasShell } from "@/components/ui/travel-atlas-shell";

export const metadata: Metadata = {
  title: "Map | PhuocAnh",
};

export default function MapPage(): ReactElement {
  return (
    <ShellPage
      description="A soft atlas surface where places, routes, and memories blend into one travel chapter."
      eyebrow="Travel map"
      quote="Routes should feel remembered, not engineered."
      title="Places map"
    >
      <PageReveal>
        <TravelAtlasShell />
      </PageReveal>
    </ShellPage>
  );
}
