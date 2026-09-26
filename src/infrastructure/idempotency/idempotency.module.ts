// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyStore } from 'src/shared-kernel/domain/stores/idempotency.store';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    IdempotencyService,
    {
      provide: IdempotencyStore,
      useExisting: IdempotencyService,
    },
  ],
  exports: [IdempotencyStore, IdempotencyService],
})
export class IdempotencyModule {}
