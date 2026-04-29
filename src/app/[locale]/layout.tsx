import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { fraunces, manrope } from '@/app/fonts';
import { QueryProvider } from '@/components/providers/query-provider';
import { SonnerToaster } from '@/components/ui/sonner-toaster';
import { getLocaleDirection, routing } from '@/i18n/routing';
import { resolveLocaleFromParams } from '@/i18n/server';

import '../globals.css';

interface RootLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateStaticParams = (): Array<{ locale: string }> =>
  routing.locales.map((locale) => ({
    locale,
  }));

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#fff5e4',
  width: 'device-width',
};

export const generateMetadata = async ({
  params,
}: {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}): Promise<Metadata> => {
  const resolvedLocale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: 'metadata.root',
  });

  return {
    description: t('description'),
    title: t('title'),
  };
};

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      dir={getLocaleDirection(locale)}
      lang={locale}
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          <QueryProvider>{children}</QueryProvider>
          <SonnerToaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
