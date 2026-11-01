import { ErrorCode } from './error-code';

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
