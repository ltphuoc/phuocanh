export type ActionMessageKey =
  | "album.created"
  | "album.invalidSubmission"
  | "album.updated"
  | "countdown.created"
  | "countdown.invalidSubmission"
  | "gameplay.dailyQuestion.alreadyAnswered"
  | "gameplay.dailyQuestion.answered"
  | "gameplay.dailyQuestion.generationFailed"
  | "gameplay.dailyQuestion.invalidSubmission"
  | "gameplay.dailyQuestion.ready"
  | "auth.invite.accepted"
  | "auth.invite.coupleFull"
  | "auth.invite.created"
  | "auth.invite.expired"
  | "auth.invite.invalidOrUsed"
  | "auth.magicLink.sent"
  | "auth.magicLink.unreachable"
  | "auth.onboarding.completed"
  | "auth.onboarding.coupleExists"
  | "auth.onboarding.invalidSubmission"
  | "auth.signInRequired"
  | "futureNote.created"
  | "futureNote.invalidSubmission"
  | "list.checklist.created"
  | "list.checklist.updated"
  | "list.checklistItem.added"
  | "list.wishItem.added"
  | "memory.createFailed"
  | "memory.created"
  | "memory.fileTooLarge"
  | "memory.missingContent"
  | "memory.unsupportedType"
  | "settings.timezone.invalidSubmission"
  | "settings.timezone.updated"
  | "trip.created"
  | "trip.invalidSubmission"
  | "visitedPlace.created"
  | "visitedPlace.invalidSubmission"
  | "unexpectedError";

export interface ActionState {
  readonly status: "idle" | "success" | "error";
  readonly message: ActionMessageKey | "";
}

export interface ActionStateWithData<TData> extends ActionState {
  readonly data?: TData;
}

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export const createSuccessState = (message: ActionMessageKey): ActionState => ({
  status: "success",
  message,
});

export const createErrorState = (message: ActionMessageKey): ActionState => ({
  status: "error",
  message,
});
