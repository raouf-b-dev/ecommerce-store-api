export const PG_UNIQUE_VIOLATION = '23505';

interface DatabaseErrorCode {
  readonly code: string;
}

interface DatabaseDriverErrorEnvelope {
  readonly driverError: DatabaseErrorCode;
}

interface DatabaseErrorWithConstraint {
  readonly constraint?: unknown;
}

interface DatabaseDriverConstraintEnvelope {
  readonly driverError: DatabaseErrorWithConstraint;
}

function hasErrorCode(error: unknown): error is DatabaseErrorCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

function hasDriverErrorCode(
  error: unknown,
): error is DatabaseDriverErrorEnvelope {
  return (
    typeof error === 'object' &&
    error !== null &&
    'driverError' in error &&
    hasErrorCode(error.driverError)
  );
}

function hasConstraint(error: unknown): error is DatabaseErrorWithConstraint {
  return typeof error === 'object' && error !== null && 'constraint' in error;
}

function hasDriverConstraintEnvelope(
  error: unknown,
): error is DatabaseDriverConstraintEnvelope {
  return (
    typeof error === 'object' &&
    error !== null &&
    'driverError' in error &&
    hasConstraint(error.driverError)
  );
}

export function isPostgresErrorCode(
  error: unknown,
  targetCode: string,
): boolean {
  if (hasErrorCode(error) && error.code === targetCode) {
    return true;
  }
  if (hasDriverErrorCode(error) && error.driverError.code === targetCode) {
    return true;
  }
  return false;
}

export function getPostgresConstraint(error: unknown): string | undefined {
  if (hasConstraint(error) && typeof error.constraint === 'string') {
    return error.constraint;
  }
  if (
    hasDriverConstraintEnvelope(error) &&
    typeof error.driverError.constraint === 'string'
  ) {
    return error.driverError.constraint;
  }
  return undefined;
}
