"use server";

import { z } from "zod";
import { routing } from "@/i18n/routing";
import {
  createErrorState,
  createSuccessState,
  type ActionState,
} from "@/lib/actions/action-state";
import { revalidateLocalizedPath } from "@/lib/i18n/revalidate";
import { generateDailyQuestionPrompt } from "@/lib/server/openai-daily-question";
import { requireReadyCoupleContext } from "@/lib/server/couple-context";
import { getTodayDailyQuestionRoundId } from "@/lib/server/phase-three-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentDateTokenInTimeZone } from "@/lib/utils/couple-timezone";

const ensureDailyQuestionRoundSchema = z.object({
  locale: z.enum(routing.locales),
});

const submitDailyQuestionAnswerSchema = z.object({
  answerBody: z.string().trim().min(1).max(800),
  roundId: z.uuid(),
});

const INVALID_DAILY_QUESTION_ROUND_MESSAGES = new Set([
  "COUPLE_CONTEXT_REQUIRED",
  "INVALID_PROMPT_LOCALE",
  "INVALID_PROMPT_SOURCE",
  "INVALID_PROMPT_TEXT",
  "UNSUPPORTED_GAME_MODE",
]);

const INVALID_DAILY_QUESTION_ANSWER_MESSAGES = new Set([
  "GAME_ROUND_NOT_FOUND",
  "INVALID_GAME_ANSWER",
]);

const revalidateGameplayPaths = (): void => {
  revalidateLocalizedPath("/games");
  revalidateLocalizedPath("/games/daily-question");
  revalidateLocalizedPath("/stats");
};

export const ensureDailyQuestionRoundAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = ensureDailyQuestionRoundSchema.parse({
      locale: formData.get("locale"),
    });
    const roundDate = getCurrentDateTokenInTimeZone(context.timezone);
    const existingRoundId = await getTodayDailyQuestionRoundId(context, roundDate);

    if (existingRoundId) {
      revalidateGameplayPaths();
      return createSuccessState("gameplay.dailyQuestion.ready");
    }

    const promptText = await generateDailyQuestionPrompt({
      coupleName: context.coupleName,
      locale: parsed.locale,
      roundDate,
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("ensure_daily_question_round", {
      prompt_locale: parsed.locale,
      prompt_source: "openai",
      prompt_text: promptText,
      target_mode: "daily_question",
      target_round_date: roundDate,
    });

    if (error) {
      if (INVALID_DAILY_QUESTION_ROUND_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.dailyQuestion.invalidSubmission");
      }

      console.error("Failed to ensure daily question round", error);
      return createErrorState("gameplay.dailyQuestion.generationFailed");
    }

    revalidateGameplayPaths();
    return createSuccessState("gameplay.dailyQuestion.ready");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("gameplay.dailyQuestion.invalidSubmission");
    }

    console.error("Failed to ensure daily question round", error);
    return createErrorState("gameplay.dailyQuestion.generationFailed");
  }
};

export const submitDailyQuestionAnswerAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = submitDailyQuestionAnswerSchema.parse({
      answerBody: formData.get("answerBody"),
      roundId: formData.get("roundId"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_daily_question_answer", {
      answer_body: parsed.answerBody,
      target_round_id: parsed.roundId,
    });

    if (error) {
      if (error.message === "GAME_ANSWER_ALREADY_SUBMITTED") {
        return createErrorState("gameplay.dailyQuestion.alreadyAnswered");
      }

      if (INVALID_DAILY_QUESTION_ANSWER_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.dailyQuestion.invalidSubmission");
      }

      console.error("Failed to submit daily question answer", error);
      return createErrorState("unexpectedError");
    }

    revalidateGameplayPaths();
    return createSuccessState("gameplay.dailyQuestion.answered");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("gameplay.dailyQuestion.invalidSubmission");
    }

    console.error("Failed to submit daily question answer", error);
    return createErrorState("unexpectedError");
  }
};
