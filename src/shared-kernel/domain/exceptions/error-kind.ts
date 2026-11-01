/** Closed set of semantic error kinds. HTTP mapping lives in the filter/interceptor layer. */
export const ErrorKind = {
  INVALID: 'INVALID',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  RULE_VIOLATION: 'RULE_VIOLATION',
  UNAVAILABLE: 'UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];
