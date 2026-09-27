import { HttpStatus } from '@nestjs/common';

/** SuperTest statuses are `number`; Nest `HttpStatus` is a numeric enum. */
export function isHttpStatus(actual: number, expected: HttpStatus): boolean {
  return actual === Number(expected);
}
