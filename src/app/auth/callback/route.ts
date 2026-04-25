import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { type NextRequest, NextResponse } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import { normalizeAuthRedirectPath } from "@/lib/auth/redirect-path";
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

interface PendingCookie {
  readonly name: string;
  readonly options?: Parameters<NextResponse["cookies"]["set"]>[2];
  readonly value: string;
}

const getRedirectOrigin = (request: NextRequest, requestUrl: URL): string => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
};

const createRedirectResponse = (
  redirectOrigin: string,
  targetPath: string,
  pendingCookies: PendingCookie[],
): NextResponse => {
  const response = NextResponse.redirect(new URL(targetPath, redirectOrigin));

  pendingCookies.forEach(({ name, options, value }) => {
    response.cookies.set(name, value, options);
  });

  return response;
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const requestUrl = new URL(request.url);
  const redirectOrigin = getRedirectOrigin(request, requestUrl);
  const fallbackLocale = resolveFallbackLocale(request);
  const fallbackPath = toLocalizedPathname(fallbackLocale, "/home");
  const authCode = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const nextPath = normalizeAuthRedirectPath(
    requestUrl.searchParams.get("next"),
    fallbackPath,
  );
  const redirectLocale = getLocaleFromPathname(nextPath) ?? fallbackLocale;
  const loginPath = toLocalizedPathname(redirectLocale, "/login");
  const otpType = requestUrl.searchParams.get("type");
  const pendingCookies: PendingCookie[] = [];
  const supabase = await createSupabaseServerClient({
    cookieOptions: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, options, value }) => {
          pendingCookies.push({
            name,
            options,
            value,
          });
        });
      },
    },
  });

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      return createRedirectResponse(redirectOrigin, loginPath, pendingCookies);
    }

    return createRedirectResponse(redirectOrigin, nextPath, pendingCookies);
  }

  if (tokenHash && otpType && isSupportedOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      return createRedirectResponse(redirectOrigin, loginPath, pendingCookies);
    }

    return createRedirectResponse(redirectOrigin, nextPath, pendingCookies);
  }

  return createRedirectResponse(redirectOrigin, loginPath, pendingCookies);
};
