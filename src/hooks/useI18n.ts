"use client";

import {
  hasLocale,
  useFormatter,
  useLocale,
  useTranslations,
  type Messages,
  type NamespaceKeys,
  type NestedKeyOf,
} from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

type TranslationNamespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;
type Translator<TNamespace extends TranslationNamespace = never> = ReturnType<
  typeof useTranslations<TNamespace>
>;

interface UseI18nResult<TNamespace extends TranslationNamespace = never> {
  readonly format: ReturnType<typeof useFormatter>;
  readonly formatCurrency: (value: number, currency?: string) => string;
  readonly locale: Locale;
  readonly t: Translator<TNamespace>;
}

const defaultCurrencyByLocale: Record<Locale, string> = {
  en: "USD",
  vi: "VND",
};

export const useI18n = <TNamespace extends TranslationNamespace = never>(
  namespace?: TNamespace,
): UseI18nResult<TNamespace> => {
  const format = useFormatter();
  const rawLocale = useLocale();
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = useTranslations(namespace);

  return {
    format,
    formatCurrency: (value: number, currency?: string): string =>
      format.number(value, {
        currency: currency ?? defaultCurrencyByLocale[locale],
        style: "currency",
      }),
    locale,
    t,
  };
};
