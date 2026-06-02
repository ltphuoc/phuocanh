import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';

import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { getLocaleFromPathname, stripLocalePrefix, toLocalizedPathname } from '@/lib/i18n/pathname';

const handleI18nRouting = createIntlMiddleware(routing);

interface AuthenticatedLookup {
  readonly status: 'authenticated';
}

interface UnauthenticatedLookup {
  readonly status: 'unauthenticated';
}

interface UnavailableLookup {
  readonly error: unknown;
  readonly status: 'unavailable';
}

type AuthLookupResult = AuthenticatedLookup | UnauthenticatedLookup | UnavailableLookup;

const isPublicPath = (pathname: string): boolean =>
  pathname.startsWith('/login') || pathname.startsWith('/accept-invite');

const isAuthCallbackPath = (pathname: string): boolean => pathname.startsWith('/auth/callback');

// Supabase may rotate the session tokens while resolving auth; those refreshed
// `sb-*` cookies are written onto the i18n response. When we instead return a
// fresh redirect response we must carry those cookies over, otherwise the rotated
// session is dropped and the user is intermittently forced to log in again.
const withCarriedCookies = (source: NextResponse, redirect: NextResponse): NextResponse => {
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  return redirect;
};

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
          status: 'unauthenticated',
        },
      };
    }

    return {
      response: mutableResponse,
      result: {
        status: 'authenticated',
      },
    };
  } catch (error: unknown) {
    console.error('Failed to resolve proxy auth state', error);

    return {
      response: mutableResponse,
      result: {
        error,
        status: 'unavailable',
      },
    };
  }
};

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  if (isAuthCallbackPath(request.nextUrl.pathname)) {
    return NextResponse.next({
      request,
    });
  }

  const i18nResponse = handleI18nRouting(request);
  if (i18nResponse.headers.get('location')) {
    return i18nResponse;
  }

  const locale = getLocaleFromPathname(request.nextUrl.pathname);
  if (!locale) {
    return i18nResponse;
  }

  const normalizedPathname = stripLocalePrefix(request.nextUrl.pathname);
  const authLookup = await getAuthLookupResult(request, i18nResponse);

  // Fail closed on a transient Supabase outage: protected routes redirect to
  // login rather than rendering a shell whose server loaders would 401 anyway.
  // Log it so an outage-driven wave of forced logouts is diagnosable.
  if (authLookup.result.status === 'unavailable') {
    console.warn('Proxy auth lookup unavailable; treating request as unauthenticated', {
      pathname: request.nextUrl.pathname,
    });
  }

  if (authLookup.result.status !== 'authenticated' && !isPublicPath(normalizedPathname)) {
    return withCarriedCookies(
      authLookup.response,
      NextResponse.redirect(new URL(toLocalizedPathname(locale, '/login'), request.url)),
    );
  }

  if (authLookup.result.status === 'authenticated' && normalizedPathname === '/login') {
    return withCarriedCookies(
      authLookup.response,
      NextResponse.redirect(new URL(toLocalizedPathname(locale, '/home'), request.url)),
    );
  }

  return authLookup.response;
};

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
