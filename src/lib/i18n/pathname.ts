import type { Locale } from '@/i18n/routing';

import { hasLocale } from 'next-intl';

import { routing } from '@/i18n/routing';

const normalizePathname = (pathname: string): string => {
  if (!pathname) {
    return '/';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

export const toLocalizedPathname = (locale: Locale, pathname: string): string => {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === `/${locale}` || normalizedPathname.startsWith(`/${locale}/`)) {
    return normalizedPathname;
  }

  if (normalizedPathname === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPathname}`;
};

export const getLocaleFromPathname = (pathname: string): Locale | null => {
  const normalizedPathname = normalizePathname(pathname);
  const [segment] = normalizedPathname.slice(1).split('/');

  if (segment && hasLocale(routing.locales, segment)) {
    return segment;
  }

  return null;
};

export const stripLocalePrefix = (pathname: string): string => {
  const locale = getLocaleFromPathname(pathname);
  const normalizedPathname = normalizePathname(pathname);

  if (!locale) {
    return normalizedPathname;
  }

  const localizedPrefix = `/${locale}`;
  if (normalizedPathname === localizedPrefix) {
    return '/';
  }

  return normalizedPathname.slice(localizedPrefix.length);
};
