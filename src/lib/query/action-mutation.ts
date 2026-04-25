"use client";

import { useMutation } from "@tanstack/react-query";
import {
  initialActionState,
  type ActionMessageKey,
  type ActionState,
} from "@/lib/actions/action-state";

type ServerAction = (
  previousState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export class ActionStateError extends Error {
  readonly state: ActionState;

  constructor(state: ActionState) {
    super(state.message || "unexpectedError");
    this.name = "ActionStateError";
    this.state = state;
  }
}

export const getActionErrorMessage = (error: unknown): ActionMessageKey => {
  if (error instanceof ActionStateError) {
    return error.state.message || "unexpectedError";
  }

  return "unexpectedError";
};

export const runActionMutation = async (
  action: ServerAction,
  payload: FormData,
): Promise<ActionState> => {
  const nextState = await action(initialActionState, payload);

  if (nextState.status !== "success") {
    throw new ActionStateError(nextState);
  }

  return nextState;
};

export const useActionMutation = (action: ServerAction) =>
  useMutation({
    mutationFn: (payload: FormData) => runActionMutation(action, payload),
  });
