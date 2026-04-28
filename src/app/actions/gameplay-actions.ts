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
import {
  getTodayDailyQuestionRoundId,
  getTodayGuessDateRoundId,
  getTodayTriviaRoundId,
} from "@/lib/server/phase-three-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentDateTokenInTimeZone } from "@/lib/utils/couple-timezone";

const ensureDailyQuestionRoundSchema = z.object({
  locale: z.enum(routing.locales),
});

const submitDailyQuestionAnswerSchema = z.object({
  answerBody: z.string().trim().min(1).max(800),
  roundId: z.uuid(),
});

const submitGuessDateAnswerSchema = z.object({
  guessedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roundId: z.uuid(),
});

const submitTriviaAnswerSchema = z.object({
  roundId: z.uuid(),
  selectedAnswer: z.string().trim().min(1).max(240),
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

const INVALID_GUESS_DATE_ROUND_MESSAGES = new Set([
  "COUPLE_CONTEXT_REQUIRED",
  "GAME_ROUND_UNAVAILABLE",
  "INVALID_ROUND_DATE",
]);

const INVALID_GUESS_DATE_ANSWER_MESSAGES = new Set([
  "GAME_ROUND_NOT_FOUND",
  "INVALID_GAME_ANSWER",
]);

const INVALID_TRIVIA_ROUND_MESSAGES = new Set([
  "COUPLE_CONTEXT_REQUIRED",
  "GAME_ROUND_UNAVAILABLE",
  "INVALID_ROUND_DATE",
]);

const INVALID_TRIVIA_ANSWER_MESSAGES = new Set([
  "GAME_ROUND_NOT_FOUND",
  "INVALID_GAME_ANSWER",
]);

const revalidateGameplayPaths = (): void => {
  revalidateLocalizedPath("/games");
  revalidateLocalizedPath("/games/daily-question");
  revalidateLocalizedPath("/stats");
};

const revalidateGuessDatePaths = (): void => {
  revalidateLocalizedPath("/games");
  revalidateLocalizedPath("/games/guess-date");
};

const revalidateTriviaPaths = (): void => {
  revalidateLocalizedPath("/games");
  revalidateLocalizedPath("/games/trivia");
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

export const ensureGuessDateRoundAction = async (
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> => {
  void _previousState;
  void _formData;

  try {
    const context = await requireReadyCoupleContext();
    const roundDate = getCurrentDateTokenInTimeZone(context.timezone);
    const existingRoundId = await getTodayGuessDateRoundId(context, roundDate);

    if (existingRoundId) {
      revalidateGuessDatePaths();
      return createSuccessState("gameplay.guessDate.ready");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("ensure_guess_date_round", {
      target_round_date: roundDate,
    });

    if (error) {
      if (error.message === "NO_GUESS_DATE_MEMORY") {
        return createErrorState("gameplay.guessDate.noMemory");
      }

      if (INVALID_GUESS_DATE_ROUND_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.guessDate.invalidSubmission");
      }

      console.error("Failed to ensure guess date round", error);
      return createErrorState("unexpectedError");
    }

    revalidateGuessDatePaths();
    return createSuccessState("gameplay.guessDate.ready");
  } catch (error: unknown) {
    console.error("Failed to ensure guess date round", error);
    return createErrorState("unexpectedError");
  }
};

export const submitGuessDateAnswerAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = submitGuessDateAnswerSchema.parse({
      guessedDate: formData.get("guessedDate"),
      roundId: formData.get("roundId"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_guess_date_answer", {
      guessed_date: parsed.guessedDate,
      target_round_id: parsed.roundId,
    });

    if (error) {
      if (error.message === "GAME_ANSWER_ALREADY_SUBMITTED") {
        return createErrorState("gameplay.guessDate.alreadyAnswered");
      }

      if (INVALID_GUESS_DATE_ANSWER_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.guessDate.invalidSubmission");
      }

      console.error("Failed to submit guess date answer", error);
      return createErrorState("unexpectedError");
    }

    revalidateGuessDatePaths();
    return createSuccessState("gameplay.guessDate.answered");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("gameplay.guessDate.invalidSubmission");
    }

    console.error("Failed to submit guess date answer", error);
    return createErrorState("unexpectedError");
  }
};

export const ensureTriviaRoundAction = async (
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> => {
  void _previousState;
  void _formData;

  try {
    const context = await requireReadyCoupleContext();
    const roundDate = getCurrentDateTokenInTimeZone(context.timezone);
    const existingRoundId = await getTodayTriviaRoundId(context, roundDate);

    if (existingRoundId) {
      revalidateTriviaPaths();
      return createSuccessState("gameplay.trivia.ready");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("ensure_trivia_round", {
      target_round_date: roundDate,
    });

    if (error) {
      if (error.message === "NO_TRIVIA_MEMORY") {
        return createErrorState("gameplay.trivia.noMemory");
      }

      if (INVALID_TRIVIA_ROUND_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.trivia.invalidSubmission");
      }

      console.error("Failed to ensure trivia round", error);
      return createErrorState("unexpectedError");
    }

    revalidateTriviaPaths();
    return createSuccessState("gameplay.trivia.ready");
  } catch (error: unknown) {
    console.error("Failed to ensure trivia round", error);
    return createErrorState("unexpectedError");
  }
};

export const submitTriviaAnswerAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = submitTriviaAnswerSchema.parse({
      roundId: formData.get("roundId"),
      selectedAnswer: formData.get("selectedAnswer"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_trivia_answer", {
      selected_answer: parsed.selectedAnswer,
      target_round_id: parsed.roundId,
    });

    if (error) {
      if (error.message === "GAME_ANSWER_ALREADY_SUBMITTED") {
        return createErrorState("gameplay.trivia.alreadyAnswered");
      }

      if (INVALID_TRIVIA_ANSWER_MESSAGES.has(error.message)) {
        return createErrorState("gameplay.trivia.invalidSubmission");
      }

      console.error("Failed to submit trivia answer", error);
      return createErrorState("unexpectedError");
    }

    revalidateTriviaPaths();
    return createSuccessState("gameplay.trivia.answered");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("gameplay.trivia.invalidSubmission");
    }

    console.error("Failed to submit trivia answer", error);
    return createErrorState("unexpectedError");
  }
};
