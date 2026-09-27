// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';

export function Idempotent() {
  return applyDecorators(UseInterceptors(IdempotencyInterceptor));
}
