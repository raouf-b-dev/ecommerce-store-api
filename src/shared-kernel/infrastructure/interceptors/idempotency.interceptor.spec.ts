import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyStore } from '../../domain/stores/idempotency.store';
import {
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyStore: jest.Mocked<IdempotencyStore>;

  beforeEach(async () => {
    const mockIdempotencyStore = {
      checkAndLock: jest.fn(),
      complete: jest.fn(),
      release: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: IdempotencyStore, useValue: mockIdempotencyStore },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    idempotencyStore = module.get(IdempotencyStore);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should proceed if no idempotency key provided', (done) => {
    const context = createMockExecutionContext({});
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
    const key = 'test-key';
    const cachedResponse = { status: 'ok' };
    const context = createMockExecutionContext({ 'x-idempotency-key': key });
    const next = createMockCallHandler(of('response'));

    idempotencyStore.checkAndLock.mockResolvedValue({
      isNew: false,
      data: cachedResponse,
    });

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toBe(cachedResponse);
        expect(next.handle).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should throw ConflictException if key exists but no data (in progress)', (done) => {
    const key = 'test-key';
    const context = createMockExecutionContext({ 'x-idempotency-key': key });
    const next = createMockCallHandler(of('response'));

    idempotencyStore.checkAndLock.mockResolvedValue({
      isNew: false,
      data: undefined,
    });

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ConflictException);
        expect(next.handle).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should proceed and complete if key is new', (done) => {
    const key = 'test-key';
    const response = { status: 'created' };
    const context = createMockExecutionContext({ 'x-idempotency-key': key });
    const next = createMockCallHandler(of(response));

    idempotencyStore.checkAndLock.mockResolvedValue({ isNew: true });
    idempotencyStore.complete.mockResolvedValue(undefined);

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toBe(response);
        expect(idempotencyStore.complete).toHaveBeenCalledWith(key, response);
        done();
      },
    });
  });

  it('should release lock if handler fails', (done) => {
    const key = 'test-key';
    const error = new Error('Handler failed');
    const context = createMockExecutionContext({ 'x-idempotency-key': key });
    const next = createMockCallHandler(throwError(() => error));

    idempotencyStore.checkAndLock.mockResolvedValue({ isNew: true });
    idempotencyStore.release.mockResolvedValue(undefined);

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(idempotencyStore.release).toHaveBeenCalledWith(key);
        done();
      },
    });
  });
});

function createMockExecutionContext(
  headers: any,
  body: any = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        body,
      }),
    }),
  } as any;
}

function createMockCallHandler(observable: any): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(observable),
  };
}
