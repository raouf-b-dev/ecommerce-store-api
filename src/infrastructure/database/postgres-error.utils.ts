interface DatabaseErrorCode {
  readonly code: string;
}

interface DatabaseDriverErrorEnvelope {
  readonly driverError: DatabaseErrorCode;
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
