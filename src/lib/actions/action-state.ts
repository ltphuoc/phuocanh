export type ActionMessageKey =
  | "auth.invite.accepted"
  | "auth.invite.coupleFull"
  | "auth.invite.created"
  | "auth.invite.expired"
  | "auth.invite.invalidOrUsed"
  | "auth.magicLink.sent"
  | "auth.magicLink.unreachable"
  | "auth.signInRequired"
  | "list.checklist.created"
  | "list.checklist.updated"
  | "list.checklistItem.added"
  | "list.wishItem.added"
  | "memory.createFailed"
  | "memory.created"
  | "memory.fileTooLarge"
  | "memory.missingContent"
  | "memory.unsupportedType"
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
