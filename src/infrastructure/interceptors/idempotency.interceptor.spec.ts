import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import {
  CallHandler,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import {
  createMockExecutionContext,
  createMockRequestWithUser,
  createMockResponse,
  IdempotencyTestFactory,
  MockIdempotencyStore,
} from '../../testing';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyStore: MockIdempotencyStore;

  const user = IdempotencyTestFactory.createCurrentUser({ userId: 42 });
  const routePath = '/orders/checkout';

  function createContext(
    clientKey: string | undefined,
    variant: 'standard' | 'legacy' = 'standard',
  ) {
    const headers =
      clientKey === undefined
        ? {}
        : IdempotencyTestFactory.createHeaders(clientKey, variant);
    const request = createMockRequestWithUser(user, {
      method: 'POST',
      headers,
      path: `/v1${routePath}`,
      route: { path: routePath },
    });
    const response = createMockResponse();
    const context = createMockExecutionContext(request, response);
    return { context, response, request, clientKey };
  }

  function expectedScopedKey(clientKey: string): string {
    return IdempotencyTestFactory.createScopedKey({
      userId: user.userId,
      method: 'POST',
      route: routePath,
      clientKey,
    });
  }

  beforeEach(async () => {
    idempotencyStore = new MockIdempotencyStore();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: IdempotencyStore, useValue: idempotencyStore },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should proceed if no idempotency key provided', (done) => {
    const { context } = createContext(undefined);
    const next = createMockCallHandler(of('response'));

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toBe('response');
        expect(idempotencyStore.checkAndLock).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should return cached response if key exists', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('cached');
    const cachedResponse = { status: 'ok' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockCompleted(cachedResponse);

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toBe(cachedResponse);
        expect(idempotencyStore.checkAndLock).toHaveBeenCalledWith(
          expectedScopedKey(clientKey),
        );
        expect(next.handle).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should accept the legacy x-idempotency-key header', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('legacy');
    const { context } = createContext(clientKey, 'legacy');
    const next = createMockCallHandler(of({ ok: true }));

    idempotencyStore.mockNewLock();

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(idempotencyStore.checkAndLock).toHaveBeenCalledWith(
          expectedScopedKey(clientKey),
        );
        done();
      },
    });
  });

  it('should throw ConflictException with Retry-After when in progress', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('inflight');
    const { context, response } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockInProgress();

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ConflictException);
        expect(response.setHeader).toHaveBeenCalledWith(
          'Retry-After',
          String(IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS),
        );
        expect(next.handle).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should throw ServiceUnavailableException when store is unavailable', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('unavailable');
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockUnavailable();

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect(next.handle).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should proceed and complete if key is new', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('new');
    const responseBody = { status: 'created' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of(responseBody));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toBe(responseBody);
        expect(idempotencyStore.complete).toHaveBeenCalledWith(
          scopedKey,
          responseBody,
        );
        done();
      },
    });
  });

  it('should fail closed with 503 when complete cannot persist', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('persist-fail');
    const responseBody = { status: 'created' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of(responseBody));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();
    idempotencyStore.mockCompleteFailure(new Error('Redis down'));
    idempotencyStore.mockReleaseSuccess();

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect(idempotencyStore.release).toHaveBeenCalledWith(scopedKey);
        done();
      },
    });
  });

  it('should release lock if handler fails', (done) => {
    const clientKey = IdempotencyTestFactory.createClientKey('handler-fail');
    const error = new Error('Handler failed');
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(throwError(() => error));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();
    idempotencyStore.mockReleaseSuccess();

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(idempotencyStore.release).toHaveBeenCalledWith(scopedKey);
        done();
      },
    });
  });
});

function createMockCallHandler(observable: unknown): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(observable),
  };
}
