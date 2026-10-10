import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import {
  CallHandler,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import {
  createMockExecutionContext,
  createMockRequestWithUser,
  createMockResponse,
  IdempotencyTestFactory,
  MockIdempotencyStore,
} from '../../testing';
import { ErrorCode } from '../../shared-kernel/domain/exceptions/error-code';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyStore: MockIdempotencyStore;

  const user = IdempotencyTestFactory.createCurrentUser({ userId: 42 });
  const routePath = '/orders/checkout';

  function createContext(
    clientKey: string | undefined,
    variant: 'standard' | 'legacy' = 'standard',
    body?: unknown,
  ) {
    const headers =
      clientKey === undefined
        ? {}
        : IdempotencyTestFactory.createHeaders(clientKey, variant);
    const request = createMockRequestWithUser(user, {
      method: 'POST',
      headers,
      body,
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

  it.each([
    {
      scenario: 'no idempotency key is provided',
      create: () => createContext(undefined),
    },
    {
      scenario: 'only legacy x-idempotency-key header is provided',
      create: () =>
        createContext(
          IdempotencyTestFactory.createClientKey('legacy'),
          'legacy',
        ),
    },
    {
      scenario: 'Idempotency-Key header is whitespace only',
      create: () => createContext('   '),
    },
    {
      scenario: 'idempotencyKey is only sent in the body',
      create: () =>
        createContext(undefined, 'standard', {
          idempotencyKey: 'body-only-key',
        }),
    },
  ])('rejects the request when $scenario', async ({ create }) => {
    const { context } = create();
    const next = createMockCallHandler(of('response'));

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.IDEMPOTENCY_KEY_REQUIRED },
    });

    expect(idempotencyStore.checkAndLock).not.toHaveBeenCalled();
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should return cached response if key exists', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('cached');
    const cachedResponse = { status: 'ok' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockCompleted(cachedResponse);

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(cachedResponse);
    expect(idempotencyStore.checkAndLock).toHaveBeenCalledWith(
      expectedScopedKey(clientKey),
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should throw ConflictException with Retry-After when in progress', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('inflight');
    const { context, response } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockInProgress();

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow(ConflictException);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      String(IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS),
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should throw ServiceUnavailableException when store is unavailable', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('unavailable');
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of('response'));

    idempotencyStore.mockUnavailable();

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should proceed and complete if key is new', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('new');
    const responseBody = { status: 'created' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of(responseBody));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(responseBody);
    expect(idempotencyStore.complete).toHaveBeenCalledWith(
      scopedKey,
      responseBody,
    );
  });

  it('should fail closed with 503 when complete cannot persist', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('persist-fail');
    const responseBody = { status: 'created' };
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(of(responseBody));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();
    idempotencyStore.mockCompleteFailure(new Error('Redis down'));
    idempotencyStore.mockReleaseSuccess();

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(idempotencyStore.release).toHaveBeenCalledWith(scopedKey);
  });

  it('should release lock if handler fails', async () => {
    const clientKey = IdempotencyTestFactory.createClientKey('handler-fail');
    const error = new Error('Handler failed');
    const { context } = createContext(clientKey);
    const next = createMockCallHandler(throwError(() => error));
    const scopedKey = expectedScopedKey(clientKey);

    idempotencyStore.mockNewLock();
    idempotencyStore.mockReleaseSuccess();

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow(error);
    expect(idempotencyStore.release).toHaveBeenCalledWith(scopedKey);
  });
});

function createMockCallHandler(observable: unknown): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(observable),
  };
}
