import {
  IdempotencyResult,
  IdempotencyStore,
} from '../../shared-kernel/domain/stores/idempotency.store';

/**
 * Typed mock for {@link IdempotencyStore}.
 * Generic methods use `MockedFunction` casts (same as {@link MockCacheService}).
 */
export class MockIdempotencyStore implements IdempotencyStore {
  checkAndLock = jest.fn().mockResolvedValue({
    isNew: true,
  } satisfies IdempotencyResult<never>) as jest.MockedFunction<
    IdempotencyStore['checkAndLock']
  >;

  complete = jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
    IdempotencyStore['complete']
  >;

  release = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

  mockNewLock(): void {
    this.checkAndLock.mockResolvedValue({ isNew: true });
  }

  mockCompleted<T>(data: T): void {
    this.checkAndLock.mockResolvedValue({ isNew: false, data });
  }

  mockInProgress(): void {
    this.checkAndLock.mockResolvedValue({ isNew: false });
  }

  mockUnavailable(): void {
    this.checkAndLock.mockResolvedValue({
      isNew: false,
      unavailable: true,
    });
  }

  mockCompleteSuccess(): void {
    this.complete.mockResolvedValue(undefined);
  }

  mockCompleteFailure(
    error: Error = new Error('Idempotency complete failed'),
  ): void {
    this.complete.mockRejectedValue(error);
  }

  mockReleaseSuccess(): void {
    this.release.mockResolvedValue(undefined);
  }

  mockReleaseFailure(
    error: Error = new Error('Idempotency release failed'),
  ): void {
    this.release.mockRejectedValue(error);
  }

  reset(): void {
    this.checkAndLock.mockReset();
    this.complete.mockReset();
    this.release.mockReset();
    this.mockNewLock();
    this.mockCompleteSuccess();
    this.mockReleaseSuccess();
  }
}
