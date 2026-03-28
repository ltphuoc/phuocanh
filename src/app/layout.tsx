import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { SonnerToaster } from "@/components/ui/sonner-toaster";
import { fraunces, manrope } from "@/app/fonts";
import "./globals.css";

export const metadata: Metadata = {
  description: "Private couple memory, timeline, and planning app.",
  title: "PhuocAnh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html
      lang="vi"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
        <SonnerToaster />
      </body>
    </html>
  );
}
