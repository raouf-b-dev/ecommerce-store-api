import { HttpStatus } from '@nestjs/common';
import { ErrorKind } from '../shared-kernel/domain/exceptions/error-kind';

/** Maps a domain ErrorKind to the HTTP status clients already receive. */
export function httpStatusFromErrorKind(kind: ErrorKind): number {
  switch (kind) {
    case ErrorKind.INVALID:
      return HttpStatus.BAD_REQUEST;
    case ErrorKind.UNAUTHENTICATED:
      return HttpStatus.UNAUTHORIZED;
    case ErrorKind.FORBIDDEN:
      return HttpStatus.FORBIDDEN;
    case ErrorKind.NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case ErrorKind.CONFLICT:
      return HttpStatus.CONFLICT;
    case ErrorKind.RULE_VIOLATION:
      return HttpStatus.UNPROCESSABLE_ENTITY;
    case ErrorKind.UNAVAILABLE:
      return HttpStatus.SERVICE_UNAVAILABLE;
    case ErrorKind.INTERNAL:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
