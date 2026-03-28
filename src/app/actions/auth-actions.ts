"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createErrorState,
  createSuccessState,
  type ActionState,
  type ActionStateWithData,
} from "@/lib/actions/action-state";
import { env } from "@/lib/env";
import { toErrorMessage } from "@/lib/errors";
import { requireReadyCoupleContext } from "@/lib/server/couple-context";
import { getSiteUrl } from "@/lib/server/site-url";
import {
  createSupabaseServerClient,
  createSupabaseServerClientForUrl,
} from "@/lib/supabase/server";

interface InviteData {
  readonly inviteUrl: string;
}

const emailSchema = z.object({
  email: z.email(),
});

const inviteTokenSchema = z.object({
  token: z.uuid(),
});

const mapAcceptInviteError = (message: string): string => {
  if (message.includes("INVITE_NOT_FOUND")) {
    return "Invite is invalid or already used.";
  }

  if (message.includes("INVITE_EXPIRED")) {
    return "Invite has expired.";
  }

  if (message.includes("COUPLE_FULL")) {
    return "This couple space already has two active members.";
  }

  if (message.includes("AUTH_REQUIRED")) {
    return "Please sign in before accepting an invite.";
  }

  return message;
};

const normalizeSupabaseUrl = (urlValue: string): string =>
  urlValue.endsWith("/") ? urlValue.slice(0, -1) : urlValue;

const getAlternateLocalSupabaseUrl = (baseUrl: string): string | null => {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return normalizeSupabaseUrl(parsed.toString());
    }

    if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      return normalizeSupabaseUrl(parsed.toString());
    }

    return null;
  } catch {
    return null;
  }
};

const isNetworkFetchError = (message: string): boolean =>
  message.toLowerCase().includes("fetch failed");

const requestMagicLink = async (
  supabaseUrl: string,
  email: string,
  emailRedirectTo: string,
): Promise<ActionState | null> => {
  try {
    const supabase = await createSupabaseServerClientForUrl(supabaseUrl);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (!error) {
      return null;
    }

    return createErrorState(error.message);
  } catch (error) {
    return createErrorState(toErrorMessage(error));
  }
};

export const sendMagicLinkAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = emailSchema.parse({
      email: formData.get("email"),
    });

    const siteUrl = await getSiteUrl();
    const emailRedirectTo = `${siteUrl}/auth/callback?next=/home`;
    const primarySupabaseUrl = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);

    const primaryError = await requestMagicLink(
      primarySupabaseUrl,
      parsed.email,
      emailRedirectTo,
    );

    if (!primaryError) {
      return createSuccessState("Check your email for the magic link.");
    }

    // Local Supabase setups often flip between localhost and 127.0.0.1; retrying both avoids
    // false-negative auth failures caused by host mismatches instead of real credential issues.
    const alternateSupabaseUrl = getAlternateLocalSupabaseUrl(primarySupabaseUrl);
    if (!alternateSupabaseUrl || !isNetworkFetchError(primaryError.message)) {
      return primaryError;
    }

    const fallbackError = await requestMagicLink(
      alternateSupabaseUrl,
      parsed.email,
      emailRedirectTo,
    );
    if (!fallbackError) {
      return createSuccessState("Check your email for the magic link.");
    }

    if (isNetworkFetchError(fallbackError.message)) {
      return createErrorState(
        "Cannot reach Supabase Auth. Ensure local Supabase is running and reachable at port 54321.",
      );
    }

    return fallbackError;
  } catch (error) {
    return createErrorState(toErrorMessage(error));
  }
};

export const createInviteAction = async (
  previousState: ActionStateWithData<InviteData>,
  formData: FormData,
): Promise<ActionStateWithData<InviteData>> => {
  void previousState;
  void formData;

  try {
    const context = await requireReadyCoupleContext();
    const supabase = await createSupabaseServerClient();
    const siteUrl = await getSiteUrl();
    const token = crypto.randomUUID();
    const expiresAt = addDays(new Date(), 14).toISOString();

    const { error } = await supabase.from("couple_invites").insert({
      couple_id: context.coupleId,
      expires_at: expiresAt,
      invited_by_user_id: context.userId,
      token,
    });

    if (error) {
      return {
        ...createErrorState(error.message),
        data: undefined,
      };
    }

    return {
      ...createSuccessState("Invite link created."),
      data: {
        inviteUrl: `${siteUrl}/accept-invite?token=${token}`,
      },
    };
  } catch (error) {
    return {
      ...createErrorState(toErrorMessage(error)),
      data: undefined,
    };
  }
};

export const acceptInviteAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = inviteTokenSchema.parse({
      token: formData.get("token"),
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createErrorState("Please sign in before accepting an invite.");
    }

    // Invite completion and membership assignment are DB-owned invariants; the app must not
    // join users to a couple by writing membership tables directly.
    const { data: acceptedRows, error } = await supabase.rpc("accept_couple_invite", {
      invite_token: parsed.token,
    });

    if (error) {
      return createErrorState(mapAcceptInviteError(error.message));
    }

    if (!acceptedRows?.[0]) {
      return createErrorState("Invite is invalid or already used.");
    }

    revalidatePath("/home");
    return createSuccessState("Invite accepted. Welcome to your couple space.");
  } catch (error) {
    return createErrorState(toErrorMessage(error));
  }
};
