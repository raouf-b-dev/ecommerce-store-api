/**
 * Returns undefined for falsy values - use when an optional cause is allowed.
 * Lives in domain so exception constructors do not import shared-kernel infra.
 */
export function toOptionalError(err: unknown): Error | undefined {
  if (!err) return undefined;
  if (err instanceof Error) return err;
  const message = toErrorMessage(err);
  return new Error(message, { cause: err });
}

function toErrorMessage(err: unknown): string {
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
