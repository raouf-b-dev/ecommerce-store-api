import { Injectable, Logger } from '@nestjs/common';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import {
  IdempotencyStore,
  IdempotencyResult,
} from '../../shared-kernel/domain/stores/idempotency.store';
import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';
import { isRecord } from '../../shared-kernel/infra/lang/is-record';

type IdempotencyStatus = typeof IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS;

type IdempotencyRecord = {
  status: IdempotencyStatus;
  data?: unknown;
};

function parseIdempotencyRecord(raw: unknown): IdempotencyRecord | null {
  if (!isRecord(raw) || typeof raw.status !== 'string') {
    return null;
  }
  if (
    raw.status !== IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS &&
    raw.status !== IDEMPOTENCY_REDIS.STATUS.COMPLETED
  ) {
    return null;
  }
  return { status: raw.status, data: raw.data };
}

/**
 * Redis-backed idempotency adapter. Depends only on {@link CachePort}
 * (hexagonal driven port) — not on Redis connection details.
 */
@Injectable()
export class IdempotencyService extends IdempotencyStore {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly cache: CachePort) {
    super();
  }

  async checkAndLock<T>(
    key: string,
    ttlSeconds: number = IDEMPOTENCY_REDIS.EXPIRATION,
  ): Promise<IdempotencyResult<T>> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    if (!this.cache.isAvailable()) {
      this.logger.warn(
        `Idempotency store unavailable for key ${key} — failing closed`,
      );
      return { isNew: false, unavailable: true };
    }

    try {
      const isLocked = await this.cache.set(
        cacheKey,
        { status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS },
        { ttl: ttlSeconds, nx: true },
      );

      if (isLocked) {
        this.logger.log(
          `Idempotency key ${key} marked as in-progress (atomic lock)`,
        );
        return { isNew: true };
      }

      const raw = await this.cache.get(cacheKey);
      const existing = parseIdempotencyRecord(raw);

      if (existing) {
        if (
          existing.status === IDEMPOTENCY_REDIS.STATUS.COMPLETED &&
          existing.data !== undefined
        ) {
          this.logger.log(`Idempotency key ${key} found with completed result`);
          return { isNew: false, data: existing.data as T };
        }
        if (existing.status === IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS) {
          this.logger.log(`Idempotency key ${key} is in-progress`);
          return { isNew: false };
        }

        this.logger.warn(
          `Idempotency key ${key} has unusable status ${existing.status} — failing closed`,
        );
        return { isNew: false, unavailable: true };
      }

      // SET NX lost and a non-null payload failed to parse (or unknown status).
      if (raw != null) {
        this.logger.warn(
          `Idempotency key ${key} occupied with malformed record — failing closed`,
        );
        return { isNew: false, unavailable: true };
      }

      // SET NX failed and GET missed: backend blip mid-call, or TTL race.
      if (!this.cache.isAvailable()) {
        this.logger.warn(
          `Idempotency store unavailable after lock miss for key ${key} — failing closed`,
        );
        return { isNew: false, unavailable: true };
      }

      this.logger.warn(
        `Idempotency TTL/race miss for key ${key} — treating as new`,
      );
      return { isNew: true };
    } catch (error) {
      this.logger.warn(
        `Idempotency store error for key ${key} — failing closed`,
        error,
      );
      return { isNew: false, unavailable: true };
    }
  }

  async complete<T>(
    key: string,
    data: T,
    ttlSeconds: number = IDEMPOTENCY_REDIS.EXPIRATION,
  ): Promise<void> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    if (!this.cache.isAvailable()) {
      throw new Error(
        `Idempotency complete failed for key ${key}: cache unavailable`,
      );
    }

    try {
      const saved = await this.cache.set(
        cacheKey,
        { status: IDEMPOTENCY_REDIS.STATUS.COMPLETED, data },
        { ttl: ttlSeconds },
      );
      if (!saved) {
        throw new Error(
          `Idempotency complete failed for key ${key}: cache set returned false`,
        );
      }
      this.logger.log(`Idempotency key ${key} marked as completed`);
    } catch (error) {
      this.logger.error(`Error completing idempotency key ${key}:`, error);
      throw error;
    }
  }

  async release(key: string): Promise<void> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    try {
      await this.cache.delete(cacheKey);
      this.logger.log(`Idempotency key ${key} released`);
    } catch (error) {
      this.logger.error(`Error releasing idempotency key ${key}:`, error);
    }
  }
}
