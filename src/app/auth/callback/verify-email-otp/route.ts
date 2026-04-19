import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

const verifyEmailOtpRequestSchema = z.object({
  email: z.email(),
  otpCode: z.string().trim().regex(/^\d{6}$/),
});

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  if (
    !env.E2E_ENABLE_EMAIL_OTP_HELPER ||
    !isLoopbackHostname(request.nextUrl.hostname)
  ) {
    return NextResponse.json(
      {
        error: "Not found.",
      },
      {
        status: 404,
      },
    );
  }

  try {
    const requestBody = verifyEmailOtpRequestSchema.parse(await request.json());
    const response = NextResponse.json({
      ok: true,
    });
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, options, value }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );
    const { error } = await supabase.auth.verifyOtp({
      email: requestBody.email,
      token: requestBody.otpCode,
      type: "email",
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 401,
        },
      );
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OTP verification request.",
        },
        {
          status: 400,
        },
      );
    }

    console.error("Failed to verify email OTP in E2E auth route", error);
    return NextResponse.json(
      {
        error: "Unexpected error.",
      },
      {
        status: 500,
      },
    );
  }
};
