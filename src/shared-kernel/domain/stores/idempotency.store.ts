// src/core/application/stores/idempotency.store.ts
export interface IdempotencyResult<T> {
  isNew: boolean;
  data?: T;
  /**
   * True when the idempotency store could not acquire or read a lock
   * (e.g. Redis unavailable). Callers must fail closed - do not execute
   * the side-effecting handler.
   */
  unavailable?: boolean;
}

export abstract class IdempotencyStore {
  abstract checkAndLock<T>(
    key: string,
    ttlSeconds?: number,
  ): Promise<IdempotencyResult<T>>;
  abstract complete<T>(
    key: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void>;
  abstract release(key: string): Promise<void>;
}
