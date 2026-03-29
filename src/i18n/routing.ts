import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  defaultLocale: "vi",
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
    name: "NEXT_LOCALE",
    path: "/",
    sameSite: "lax",
  },
  localeDetection: true,
  localePrefix: "always",
  locales: ["vi", "en"],
});

export type Locale = (typeof routing.locales)[number];

export const localeDisplayNames: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
};

export const getLocaleDirection = (locale: Locale): "ltr" => {
  void locale;
  return "ltr";
};
