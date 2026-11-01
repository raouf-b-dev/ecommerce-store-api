/**
 * Safe, lint-friendly helpers for normalizing unknown thrown/rejected values.
 * Use these instead of `err instanceof Error ? err : new Error(String(err))`.
 */

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (
    typeof err === 'number' ||
    typeof err === 'boolean' ||
    typeof err === 'bigint'
  ) {
    return `${err}`;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const message = err.message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
}

/** Always returns an Error - use for logging, wrapping, or rethrowing. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  const message = toErrorMessage(err);
  if (err !== undefined && err !== null) {
    return new Error(message, { cause: err });
  }
  return new Error(message);
}

/** Returns undefined for falsy values - use when an optional cause is allowed. */
export function toOptionalError(err: unknown): Error | undefined {
  if (!err) return undefined;
  return toError(err);
}
