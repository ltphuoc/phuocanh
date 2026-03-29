import { hasLocale, IntlErrorCode } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import type { PartialDeep, Simplify } from "type-fest";
import enMessages from "../../messages/en.json";
import viMessages from "../../messages/vi.json";
import { routing, type Locale } from "@/i18n/routing";

interface MessagesTree {
  readonly [key: string]: string | MessagesTree;
}

type ResolvedMessages = Simplify<MessagesTree>;

const dictionaries: Record<Locale, MessagesTree> = {
  en: enMessages,
  vi: viMessages,
};

const isMessagesTree = (value: unknown): value is MessagesTree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeMessages = (
  base: MessagesTree,
  override: PartialDeep<MessagesTree>,
): ResolvedMessages => {
  const merged: Record<string, string | MessagesTree> = {
    ...base,
  };

  Object.entries(override).forEach(([key, overrideValue]) => {
    if (overrideValue === undefined) {
      return;
    }

    const baseValue = base[key];

    if (typeof overrideValue === "string") {
      merged[key] = overrideValue;
      return;
    }

    if (isMessagesTree(baseValue) && isMessagesTree(overrideValue)) {
      merged[key] = mergeMessages(baseValue, overrideValue);
      return;
    }

    if (isMessagesTree(overrideValue)) {
      merged[key] = mergeMessages({}, overrideValue);
    }
  });

  return merged;
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  const localeMessages = dictionaries[locale];
  const messages = locale === "en" ? dictionaries.en : mergeMessages(dictionaries.en, localeMessages);

  return {
    getMessageFallback: ({ key, namespace }) => {
      if (!namespace) {
        return key;
      }

      return `${namespace}.${key}`;
    },
    locale,
    messages,
    onError: (error) => {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.error("Missing translation message", error);
        return;
      }

      console.error("Translation runtime error", error);
    },
  };
});
