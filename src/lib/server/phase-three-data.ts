import "server-only";
import { z } from "zod";
import { routing, type Locale } from "@/i18n/routing";
import type { CoupleContext } from "@/lib/server/couple-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getCurrentDateTokenInTimeZone } from "@/lib/utils/couple-timezone";

const DAILY_QUESTION_MODE: Database["public"]["Enums"]["game_mode"] = "daily_question";
const EXPECTED_DAILY_QUESTION_ANSWER_COUNT = 2;
const RECENT_HISTORY_DAYS = 14;

const gameRoundIdSchema = z.uuid();
const promptLocaleSchema = z.enum(routing.locales);
const dailyQuestionStatusSchema = z.enum([
  "completed",
  "not_started",
  "waiting_for_partner",
  "waiting_for_you",
]);

const dailyQuestionRevealedAnswerSchema = z.object({
  answerBody: z.string().trim().min(1).max(800),
  author: z.enum(["partner", "viewer"]),
  submittedAt: z.string().trim().min(1),
});

const dailyQuestionRoundStateRpcRowSchema = z.object({
  answer_count: z.number().int().min(0),
  id: z.uuid(),
  prompt_locale: promptLocaleSchema,
  prompt_source: z.string().trim().min(1),
  prompt_text: z.string().trim().min(1).max(240),
  reveal_answers: z.boolean(),
  revealed_answers: z.array(dailyQuestionRevealedAnswerSchema),
  round_date: z.string().trim().min(1),
  viewer_has_answered: z.boolean(),
});

const gameplayHistoryEntrySchema = z.object({
  dateToken: z.string().trim().min(1),
  status: dailyQuestionStatusSchema,
});

const gameplayStatsRpcRowSchema = z.object({
  current_streak: z.number().int().min(0),
  recent_history: z.array(gameplayHistoryEntrySchema),
  total_completed_rounds: z.number().int().min(0),
  total_rounds: z.number().int().min(0),
  viewer_participation_count: z.number().int().min(0),
  viewer_participation_rate: z.number().int().min(0).max(100),
});

type GameRoundRow = Database["public"]["Tables"]["game_rounds"]["Row"];
type GameRoundIdLookupRow = Pick<GameRoundRow, "id">;
type DailyQuestionRoundStateRpcRow = z.infer<typeof dailyQuestionRoundStateRpcRowSchema>;

export type DailyQuestionStatus =
  | "completed"
  | "not_started"
  | "waiting_for_partner"
  | "waiting_for_you";

export interface DailyQuestionRevealedAnswer {
  readonly answerBody: string;
  readonly author: "partner" | "viewer";
  readonly submittedAt: string;
}

export interface DailyQuestionRoundState {
  readonly answerCount: number;
  readonly id: string;
  readonly promptLocale: Locale;
  readonly promptSource: string;
  readonly promptText: string;
  readonly revealAnswers: boolean;
  readonly revealedAnswers: readonly DailyQuestionRevealedAnswer[];
  readonly roundDate: string;
  readonly status: DailyQuestionStatus;
  readonly viewerHasAnswered: boolean;
}

export interface GamesHubData {
  readonly dailyQuestion: DailyQuestionRoundState | null;
  readonly todayDateToken: string;
}

export interface DailyQuestionPageData {
  readonly round: DailyQuestionRoundState | null;
  readonly todayDateToken: string;
}

export interface GameplayHistoryEntry {
  readonly dateToken: string;
  readonly status: DailyQuestionStatus;
}

export interface GameplayStatsPageData {
  readonly currentStreak: number;
  readonly recentHistory: readonly GameplayHistoryEntry[];
  readonly totalCompletedRounds: number;
  readonly totalRounds: number;
  readonly viewerParticipationCount: number;
  readonly viewerParticipationRate: number;
}

const getDailyQuestionStatus = (
  answerCount: number,
  viewerHasAnswered: boolean,
): DailyQuestionStatus => {
  if (answerCount >= EXPECTED_DAILY_QUESTION_ANSWER_COUNT) {
    return "completed";
  }

  if (viewerHasAnswered) {
    return "waiting_for_partner";
  }

  if (answerCount > 0) {
    return "waiting_for_you";
  }

  return "not_started";
};

const buildRoundStateFromRpcRow = (
  row: DailyQuestionRoundStateRpcRow,
): DailyQuestionRoundState => {
  const status = getDailyQuestionStatus(row.answer_count, row.viewer_has_answered);
  return {
    answerCount: row.answer_count,
    id: row.id,
    promptLocale: row.prompt_locale,
    promptSource: row.prompt_source,
    promptText: row.prompt_text,
    revealAnswers: row.reveal_answers,
    revealedAnswers: row.reveal_answers ? row.revealed_answers : [],
    roundDate: row.round_date,
    status,
    viewerHasAnswered: row.viewer_has_answered,
  };
};

const getDailyQuestionRoundState = async (
  roundDate: string,
): Promise<DailyQuestionRoundState | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_daily_question_round_state", {
    target_round_date: roundDate,
  });

  if (error) {
    throw new Error(error.message);
  }

  const parsedRow = dailyQuestionRoundStateRpcRowSchema.safeParse(data[0] ?? null);
  if (!parsedRow.success) {
    if (data[0] == null) {
      return null;
    }

    throw new Error("Invalid daily question round state payload.");
  }

  return buildRoundStateFromRpcRow(parsedRow.data);
};

export const getTodayDailyQuestionRoundId = async (
  context: CoupleContext,
  roundDate: string,
): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("game_rounds")
    .select("id")
    .eq("couple_id", context.coupleId)
    .eq("mode", DAILY_QUESTION_MODE)
    .eq("round_date", roundDate)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const round: GameRoundIdLookupRow | null = data[0] ?? null;
  return round?.id ?? null;
};

export const getGamesHubData = async (
  context: CoupleContext,
): Promise<GamesHubData> => {
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);

  return {
    dailyQuestion: await getDailyQuestionRoundState(todayDateToken),
    todayDateToken,
  };
};

export const getDailyQuestionPageData = async (
  context: CoupleContext,
  roundId?: string,
): Promise<DailyQuestionPageData> => {
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);

  if (roundId) {
    const parsedRoundId = gameRoundIdSchema.safeParse(roundId);
    if (!parsedRoundId.success) {
      return {
        round: null,
        todayDateToken,
      };
    }
  }

  const todayRound = await getDailyQuestionRoundState(todayDateToken);

  if (!todayRound) {
    return {
      round: null,
      todayDateToken,
    };
  }

  if (roundId && todayRound.id !== roundId) {
    return {
      round: null,
      todayDateToken,
    };
  }

  return {
    round: todayRound,
    todayDateToken,
  };
};

export const getGameplayStatsPageData = async (
  context: CoupleContext,
): Promise<GameplayStatsPageData> => {
  void context;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_daily_question_stats", {
    target_history_days: RECENT_HISTORY_DAYS,
  });

  if (error) {
    throw new Error(error.message);
  }

  const parsedStats = gameplayStatsRpcRowSchema.parse(data[0] ?? null);

  return {
    currentStreak: parsedStats.current_streak,
    recentHistory: parsedStats.recent_history,
    totalCompletedRounds: parsedStats.total_completed_rounds,
    totalRounds: parsedStats.total_rounds,
    viewerParticipationCount: parsedStats.viewer_participation_count,
    viewerParticipationRate: parsedStats.viewer_participation_rate,
  };
};
