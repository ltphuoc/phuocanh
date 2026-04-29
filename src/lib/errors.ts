const SCHEMA_READINESS_TOKEN = '[SCHEMA_NOT_READY]';

export const localSchemaRecoverySteps: readonly string[] = [
  'supabase start',
  'supabase db reset --local',
  'pnpm dev',
] as const;

export class SchemaReadinessError extends Error {
  public readonly code = 'SCHEMA_NOT_READY';
  public readonly missingResource: string;

  public constructor(missingResource: string) {
    super(
      `${SCHEMA_READINESS_TOKEN} Local database schema is not ready (${missingResource}). ` +
        'Run local migrations before using the app.',
    );
    this.name = 'SchemaReadinessError';
    this.missingResource = missingResource;
  }
}

export const isSchemaCacheMissMessage = (message: string): boolean =>
  message.toLowerCase().includes('schema cache') &&
  message.toLowerCase().includes('could not find the table');

export const isSchemaReadinessErrorMessage = (message: string): boolean =>
  message.includes(SCHEMA_READINESS_TOKEN);

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error occurred.';
};
