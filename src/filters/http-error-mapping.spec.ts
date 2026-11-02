import { HttpStatus } from '@nestjs/common';
import { ErrorKind } from '../shared-kernel/domain/exceptions/error-kind';
import { httpStatusFromErrorKind } from './http-error-mapping';

describe('httpStatusFromErrorKind', () => {
  it.each([
    [ErrorKind.INVALID, HttpStatus.BAD_REQUEST],
    [ErrorKind.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED],
    [ErrorKind.FORBIDDEN, HttpStatus.FORBIDDEN],
    [ErrorKind.NOT_FOUND, HttpStatus.NOT_FOUND],
    [ErrorKind.CONFLICT, HttpStatus.CONFLICT],
    [ErrorKind.RULE_VIOLATION, HttpStatus.UNPROCESSABLE_ENTITY],
    [ErrorKind.UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE],
    [ErrorKind.INTERNAL, HttpStatus.INTERNAL_SERVER_ERROR],
  ] as const)('maps %s to %s', (kind, status) => {
    expect(httpStatusFromErrorKind(kind)).toBe(status);
  });
});
