export const PG_UNIQUE_VIOLATION = '23505';

export interface PostgresErrorDetails {
  readonly code?: string;
  readonly constraint?: string;
}

function readCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

function readConstraint(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'constraint' in error &&
    typeof error.constraint === 'string'
  ) {
    return error.constraint;
  }
  return undefined;
}

export function getPostgresErrorDetails(error: unknown): PostgresErrorDetails {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const driverError = 'driverError' in error ? error.driverError : undefined;

  return {
    code: readCode(error) ?? readCode(driverError),
    constraint: readConstraint(error) ?? readConstraint(driverError),
  };
}
