// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { HttpStatus } from '@nestjs/common';

/** SuperTest statuses are `number`; Nest `HttpStatus` is a numeric enum. */
export function isHttpStatus(actual: number, expected: HttpStatus): boolean {
  return actual === Number(expected);
}
