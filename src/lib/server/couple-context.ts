import { format } from "date-fns";
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

interface ReadyState {
  readonly context: CoupleContext;
  readonly status: "ready";
}

export type AuthGateState = UnauthenticatedState | NeedsInviteState | ReadyState;

interface MembershipRow {
  readonly couple_id: string;
  readonly role: MembershipRole;
}

interface CoupleRow {
  readonly id: string;
  readonly name: string | null;
  readonly started_at: string;
}

const DEFAULT_COUPLE_NAME = "Our Space";

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
    .select("id, name, started_at")
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

const bootstrapCoupleForUser = async (
  userId: string,
  email: string | null,
): Promise<CoupleContext | null> => {
  const supabase = await createSupabaseServerClient();
  const today = format(new Date(), "yyyy-MM-dd");
  // The first authenticated user claims the singleton couple space in SQL so UI redirects
  // cannot race or create duplicate spaces from app-layer writes.
  const { data: bootstrappedRows, error } = await supabase.rpc("bootstrap_first_couple", {
    couple_name: DEFAULT_COUPLE_NAME,
    started_date: today,
  });

  if (error) {
    if (error.message.includes("COUPLE_EXISTS")) {
      // If the singleton space already exists and this user is not a member, the only legal
      // path forward is invite acceptance rather than implicit attachment.
      return null;
    }

    throw new Error(error.message);
  }

  const bootstrappedCouple = bootstrappedRows?.[0] ?? null;
  if (!bootstrappedCouple) {
    throw new Error("Could not bootstrap couple space.");
  }

  return {
    coupleId: bootstrappedCouple.couple_id,
    coupleName: bootstrappedCouple.name,
    coupleStartedAt: bootstrappedCouple.started_at,
    email,
    role: bootstrappedCouple.role,
    userId,
  };
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
        userId: user.id,
      },
      status: "ready",
    };
  }

  const bootstrappedContext = await bootstrapCoupleForUser(user.id, user.email ?? null);
  if (bootstrappedContext) {
    return {
      context: bootstrappedContext,
      status: "ready",
    };
  }

  return {
    email: user.email ?? null,
    status: "needs_invite",
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
    case "unauthenticated":
    default:
      redirect(toLocalizedPathname(locale, "/login"));
  }
};

export type { CoupleContext };
