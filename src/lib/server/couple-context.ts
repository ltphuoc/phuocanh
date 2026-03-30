import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { isSchemaCacheMissMessage, SchemaReadinessError } from "@/lib/errors";
import { toLocalizedPathname } from "@/lib/i18n/pathname";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type MembershipRole = Database["public"]["Enums"]["membership_role"];

interface CoupleContext {
  readonly coupleId: string;
  readonly coupleName: string | null;
  readonly coupleStartedAt: string;
  readonly email: string | null;
  readonly role: MembershipRole;
  readonly timezone: string;
  readonly userId: string;
}

interface UnauthenticatedState {
  readonly status: "unauthenticated";
}

interface NeedsInviteState {
  readonly email: string | null;
  readonly status: "needs_invite";
  readonly userId: string;
}

interface NeedsOnboardingState {
  readonly email: string | null;
  readonly status: "needs_onboarding";
  readonly userId: string;
}

interface ReadyState {
  readonly context: CoupleContext;
  readonly status: "ready";
}

export type AuthGateState =
  | UnauthenticatedState
  | NeedsInviteState
  | NeedsOnboardingState
  | ReadyState;

interface MembershipRow {
  readonly couple_id: string;
  readonly role: MembershipRole;
}

interface CoupleRow {
  readonly id: string;
  readonly name: string | null;
  readonly started_at: string;
  readonly timezone: string;
}

interface ExistingCoupleRow {
  readonly id: string;
}

const getMembershipForUser = async (
  userId: string,
): Promise<MembershipRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("couple_memberships")
    .select("couple_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (error) {
    if (isSchemaCacheMissMessage(error.message)) {
      throw new SchemaReadinessError("public.couple_memberships");
    }

    throw new Error(error.message);
  }

  return data[0] ?? null;
};

const getCoupleById = async (coupleId: string): Promise<CoupleRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("couples")
    .select("id, name, started_at, timezone")
    .eq("id", coupleId)
    .limit(1);

  if (error) {
    if (isSchemaCacheMissMessage(error.message)) {
      throw new SchemaReadinessError("public.couples");
    }

    throw new Error(error.message);
  }

  return data[0] ?? null;
};

const getAnyCouple = async (): Promise<ExistingCoupleRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("couples").select("id").limit(1);

  if (error) {
    if (isSchemaCacheMissMessage(error.message)) {
      throw new SchemaReadinessError("public.couples");
    }

    throw new Error(error.message);
  }

  return data[0] ?? null;
};

export const getAuthGateState = async (): Promise<AuthGateState> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "unauthenticated",
    };
  }

  const membership = await getMembershipForUser(user.id);
  if (membership) {
    const couple = await getCoupleById(membership.couple_id);
    if (!couple) {
      throw new Error("Couple not found.");
    }

    return {
      context: {
        coupleId: couple.id,
        coupleName: couple.name,
        coupleStartedAt: couple.started_at,
        email: user.email ?? null,
        role: membership.role,
        timezone: couple.timezone,
        userId: user.id,
      },
      status: "ready",
    };
  }

  const existingCouple = await getAnyCouple();
  if (existingCouple) {
    return {
      email: user.email ?? null,
      status: "needs_invite",
      userId: user.id,
    };
  }

  return {
    email: user.email ?? null,
    status: "needs_onboarding",
    userId: user.id,
  };
};

export const requireReadyCoupleContext = async (): Promise<CoupleContext> => {
  const state = await getAuthGateState();
  if (state.status !== "ready") {
    throw new Error("Couple context is not ready.");
  }

  return state.context;
};

export const getReadyCoupleContextOrRedirect = async (
  locale: Locale,
): Promise<CoupleContext> => {
  const state = await getAuthGateState();

  switch (state.status) {
    case "ready":
      return state.context;
    case "needs_invite":
      redirect(toLocalizedPathname(locale, "/accept-invite"));
    case "needs_onboarding":
      redirect(toLocalizedPathname(locale, "/onboarding"));
    case "unauthenticated":
    default:
      redirect(toLocalizedPathname(locale, "/login"));
  }
};

export type { CoupleContext };
