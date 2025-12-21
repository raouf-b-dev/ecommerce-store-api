import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyStore } from '../../domain/stores/idempotency.store';
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
