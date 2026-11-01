import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

/** Fields a caller sets by name. Omit a field to keep that error class's default. */
export type ErrorOptions = {
  cause?: unknown;
  kind?: ErrorKind;
  retryable?: boolean;
  code?: ErrorCode;
};

/** Factory default for Repository/Infrastructure/Query: INTERNAL/UNAVAILABLE/absent -> true. */
export function isRetryableErrorKind(kind?: ErrorKind): boolean {
  if (!kind) return true;
  return kind === ErrorKind.INTERNAL || kind === ErrorKind.UNAVAILABLE;
}
