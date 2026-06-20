export type ActionMessageKey =
  | 'album.created'
  | 'album.invalidSubmission'
  | 'album.updated'
  | 'countdown.created'
  | 'countdown.invalidSubmission'
  | 'gameplay.dailyQuestion.alreadyAnswered'
  | 'gameplay.dailyQuestion.answered'
  | 'gameplay.dailyQuestion.generationFailed'
  | 'gameplay.dailyQuestion.invalidSubmission'
  | 'gameplay.dailyQuestion.ready'
  | 'gameplay.guessDate.alreadyAnswered'
  | 'gameplay.guessDate.answered'
  | 'gameplay.guessDate.invalidSubmission'
  | 'gameplay.guessDate.noMemory'
  | 'gameplay.guessDate.ready'
  | 'gameplay.trivia.alreadyAnswered'
  | 'gameplay.trivia.answered'
  | 'gameplay.trivia.invalidSubmission'
  | 'gameplay.trivia.noMemory'
  | 'gameplay.trivia.ready'
  | 'auth.invite.accepted'
  | 'auth.invite.alreadyMember'
  | 'auth.invite.coupleFull'
  | 'auth.invite.created'
  | 'auth.invite.expired'
  | 'auth.invite.invalidOrUsed'
  | 'auth.magicLink.sent'
  | 'auth.magicLink.unreachable'
  | 'auth.onboarding.completed'
  | 'auth.onboarding.coupleExists'
  | 'auth.onboarding.invalidSubmission'
  | 'auth.signInRequired'
  | 'futureNote.created'
  | 'futureNote.invalidSubmission'
  | 'list.checklist.created'
  | 'list.checklist.updated'
  | 'list.checklistItem.added'
  | 'list.wishItem.added'
  | 'memory.createFailed'
  | 'memory.created'
  | 'memory.deleted'
  | 'memory.fileTooLarge'
  | 'memory.invalidSubmission'
  | 'memory.missingContent'
  | 'memory.notFound'
  | 'memory.unsupportedType'
  | 'memory.updated'
  | 'settings.timezone.invalidSubmission'
  | 'settings.timezone.updated'
  | 'trip.created'
  | 'trip.deleted'
  | 'trip.invalidDateRangeWithStops'
  | 'trip.invalidSubmission'
  | 'trip.updated'
  | 'visitedPlace.created'
  | 'visitedPlace.invalidSubmission'
  | 'unexpectedError';

export interface ActionState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: ActionMessageKey | '';
}

export interface ActionStateWithData<TData> extends ActionState {
  readonly data?: TData;
}

export const initialActionState: ActionState = {
  status: 'idle',
  message: '',
};

export const createSuccessState = (message: ActionMessageKey): ActionState => ({
  status: 'success',
  message,
});

export const createErrorState = (message: ActionMessageKey): ActionState => ({
  status: 'error',
  message,
});
