import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { type NextRequest, NextResponse } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import { getLocaleFromPathname, toLocalizedPathname } from "@/lib/i18n/pathname";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const isSupportedOtpType = (value: string): value is EmailOtpType =>
  [
    "email",
    "recovery",
    "invite",
    "email_change",
    "signup",
    "magiclink",
  ].includes(value);

const DEFAULT_LOCALE_COOKIE_NAME = "NEXT_LOCALE";

const normalizeNextPath = (candidatePath: string | null, fallbackPath: string): string => {
  if (!candidatePath) {
    return fallbackPath;
  }

  // Auth callbacks only allow internal app paths; rejecting malformed or protocol-relative
  // values keeps the login flow from becoming an open-redirect sink.
  if (!candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return fallbackPath;
  }

  if (candidatePath.includes("\\")) {
    return fallbackPath;
  }

  try {
    const normalizedUrl = new URL(candidatePath, "https://internal.local");
    if (normalizedUrl.origin !== "https://internal.local") {
      return fallbackPath;
    }

    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return fallbackPath;
  }
};

const resolveFallbackLocale = (request: NextRequest): Locale => {
  const configuredCookieName =
    typeof routing.localeCookie === "object"
      ? routing.localeCookie.name
      : undefined;
  const localeCookieName = configuredCookieName ?? DEFAULT_LOCALE_COOKIE_NAME;
  const localeFromCookie = request.cookies.get(localeCookieName)?.value;

  if (localeFromCookie && hasLocale(routing.locales, localeFromCookie)) {
    return localeFromCookie;
  }

  return routing.defaultLocale;
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const requestUrl = new URL(request.url);
  const fallbackLocale = resolveFallbackLocale(request);
  const fallbackPath = toLocalizedPathname(fallbackLocale, "/home");
  const authCode = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"), fallbackPath);
  const redirectLocale = getLocaleFromPathname(nextPath) ?? fallbackLocale;
  const loginPath = toLocalizedPathname(redirectLocale, "/login");
  const otpType = requestUrl.searchParams.get("type");
  const supabase = await createSupabaseServerClient();

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      return NextResponse.redirect(new URL(loginPath, requestUrl.origin));
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  if (tokenHash && otpType && isSupportedOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      return NextResponse.redirect(new URL(loginPath, requestUrl.origin));
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(loginPath, requestUrl.origin));
};
