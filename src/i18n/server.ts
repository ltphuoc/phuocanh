import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import type enMessages from '../../messages/en.json';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';

interface LocaleRouteParams {
  readonly locale: string;
}

type MetadataRouteKey = keyof typeof enMessages.metadata.routes;

export const resolveLocale = (rawLocale: string): Locale =>
  hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

export const resolveLocaleFromParams = async (
  params?: Promise<LocaleRouteParams> | LocaleRouteParams,
): Promise<Locale> => {
  if (!params) {
    return routing.defaultLocale;
  }

  const resolvedParams = await params;
  if (!resolvedParams || typeof resolvedParams.locale !== 'string') {
    return routing.defaultLocale;
  }

  return resolveLocale(resolvedParams.locale);
};

export const getRouteMetadata = async (
  params: Promise<LocaleRouteParams> | LocaleRouteParams | undefined,
  routeKey: MetadataRouteKey,
): Promise<Metadata> => {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: 'metadata.routes',
  });

  return {
    title: t(routeKey),
  };
};
