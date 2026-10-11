export const PG_UNIQUE_VIOLATION = '23505';

export interface PostgresErrorDetails {
  readonly code?: string;
  readonly constraint?: string;
}

export function getPostgresErrorDetails(error: unknown): PostgresErrorDetails {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const driverError =
    'driverError' in error &&
    typeof error.driverError === 'object' &&
    error.driverError !== null
      ? error.driverError
      : undefined;

  const code =
    'code' in error && typeof error.code === 'string'
      ? error.code
      : driverError &&
          'code' in driverError &&
          typeof driverError.code === 'string'
        ? driverError.code
        : undefined;

  const constraint =
    'constraint' in error && typeof error.constraint === 'string'
      ? error.constraint
      : driverError &&
          'constraint' in driverError &&
          typeof driverError.constraint === 'string'
        ? driverError.constraint
        : undefined;

  return { code, constraint };
}

export const getPostgresError = getPostgresErrorDetails;
