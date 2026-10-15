/** HTTP status numbers without a NestJS import. Callers may still pass Nest's HttpStatus enum. */
export const StatusCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];
