export interface ActionState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

export interface ActionStateWithData<TData> extends ActionState {
  readonly data?: TData;
}

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export const createSuccessState = (message: string): ActionState => ({
  status: "success",
  message,
});

export const createErrorState = (message: string): ActionState => ({
  status: "error",
  message,
});
