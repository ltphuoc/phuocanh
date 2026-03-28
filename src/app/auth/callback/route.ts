import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
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

const CALLBACK_FALLBACK_PATH = "/home";

const normalizeNextPath = (candidatePath: string | null): string => {
  if (!candidatePath) {
    return CALLBACK_FALLBACK_PATH;
  }

  // Auth callbacks only allow internal app paths; rejecting malformed or protocol-relative
  // values keeps the login flow from becoming an open-redirect sink.
  if (!candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return CALLBACK_FALLBACK_PATH;
  }

  if (candidatePath.includes("\\")) {
    return CALLBACK_FALLBACK_PATH;
  }

  try {
    const normalizedUrl = new URL(candidatePath, "https://internal.local");
    if (normalizedUrl.origin !== "https://internal.local") {
      return CALLBACK_FALLBACK_PATH;
    }

    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return CALLBACK_FALLBACK_PATH;
  }
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const requestUrl = new URL(request.url);
  const authCode = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const otpType = requestUrl.searchParams.get("type");
  const supabase = await createSupabaseServerClient();

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      return NextResponse.redirect(new URL("/login", requestUrl.origin));
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  if (tokenHash && otpType && isSupportedOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      return NextResponse.redirect(new URL("/login", requestUrl.origin));
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
};
