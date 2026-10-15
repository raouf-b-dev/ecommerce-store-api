import { ErrorCode } from './error-code';
import { toOptionalError } from '../../infra/lang/error.utils';

/** Fields a caller sets by name. Omit a field to keep that error class's default. */
export type ErrorOptions = {
  cause?: unknown;
  status?: number;
  retryable?: boolean;
  code?: ErrorCode;
};

export function isRetryableHttpStatus(status?: number): boolean {
  if (!status) return true;
  return status >= 500;
}

export function isErrorOptions(value: unknown): value is ErrorOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (value instanceof Error) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (
      key !== 'cause' &&
      key !== 'status' &&
      key !== 'retryable' &&
      key !== 'code'
    ) {
      return false;
    }
  }
  return true;
}

export function resolveErrorArgs(
  causeOrOptions: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): {
  cause: Error | undefined;
  status?: number;
  retryable?: boolean;
  code?: ErrorCode;
} {
  const options = isErrorOptions(causeOrOptions)
    ? causeOrOptions
    : { cause: causeOrOptions, status, retryable, code };

  return {
    cause: toOptionalError(options.cause),
    status: options.status,
    retryable: options.retryable,
    code: options.code,
  };
}
