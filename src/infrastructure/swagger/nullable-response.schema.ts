// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Type } from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';

/**
 * OpenAPI 3.0 nullable response schema. Pair with `@ApiExtraModels(DtoClass)` on the handler.
 */
export function nullableResponseSchema<T>(dto: Type<T>) {
  return {
    nullable: true,
    allOf: [{ $ref: getSchemaPath(dto) }],
  };
}
