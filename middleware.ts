import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { getLocaleFromPathname, stripLocalePrefix, toLocalizedPathname } from "@/lib/i18n/pathname";
import type { Database } from "@/lib/supabase/database.types";

const handleI18nRouting = createIntlMiddleware(routing);

interface AuthenticatedLookup {
  readonly status: "authenticated";
}

interface UnauthenticatedLookup {
  readonly status: "unauthenticated";
}

interface UnavailableLookup {
  readonly error: unknown;
  readonly status: "unavailable";
}

type AuthLookupResult = AuthenticatedLookup | UnauthenticatedLookup | UnavailableLookup;

const isPublicPath = (pathname: string): boolean =>
  pathname.startsWith("/login") || pathname.startsWith("/accept-invite");

const isAuthCallbackPath = (pathname: string): boolean => pathname.startsWith("/auth/callback");

const getAuthLookupResult = async (
  request: NextRequest,
  response: NextResponse,
): Promise<{
  readonly result: AuthLookupResult;
  readonly response: NextResponse;
}> => {
  let mutableResponse = response;

  try {
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

            mutableResponse = NextResponse.next({
              request,
            });

            cookiesToSet.forEach(({ name, options, value }) => {
              mutableResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        response: mutableResponse,
        result: {
          status: "unauthenticated",
        },
      };
    }

    return {
      response: mutableResponse,
      result: {
        status: "authenticated",
      },
    };
  } catch (error: unknown) {
    console.error("Failed to resolve middleware auth state", error);

    return {
      response: mutableResponse,
      result: {
        error,
        status: "unavailable",
      },
    };
  }
};

export const middleware = async (
  request: NextRequest,
): Promise<NextResponse> => {
  if (isAuthCallbackPath(request.nextUrl.pathname)) {
    return NextResponse.next({
      request,
    });
  }

  const i18nResponse = handleI18nRouting(request);
  if (i18nResponse.headers.get("location")) {
    return i18nResponse;
  }

  const locale = getLocaleFromPathname(request.nextUrl.pathname);
  if (!locale) {
    return i18nResponse;
  }

  const normalizedPathname = stripLocalePrefix(request.nextUrl.pathname);
  const authLookup = await getAuthLookupResult(request, i18nResponse);

  if (
    authLookup.result.status !== "authenticated" &&
    !isPublicPath(normalizedPathname)
  ) {
    return NextResponse.redirect(new URL(toLocalizedPathname(locale, "/login"), request.url));
  }

  if (authLookup.result.status === "authenticated" && normalizedPathname === "/login") {
    return NextResponse.redirect(new URL(toLocalizedPathname(locale, "/home"), request.url));
  }

  return authLookup.response;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
