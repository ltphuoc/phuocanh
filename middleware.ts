import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

const isPublicPath = (pathname: string): boolean =>
  pathname.startsWith("/login") ||
  pathname.startsWith("/accept-invite") ||
  pathname.startsWith("/auth/callback");

export const middleware = async (
  request: NextRequest,
): Promise<NextResponse> => {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
