import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * Correlation store — the shape stored in AsyncLocalStorage.
 */
export interface CorrelationStore {
  correlationId: string;
}

/**
 * CorrelationService wraps Node.js AsyncLocalStorage to provide
 * a request-scoped correlation ID that propagates automatically
 * through every async call in the same execution context.
 *
 * Usage:
 * - Middleware calls `run()` at the start of each HTTP request.
 * - Any service calls `getId()` to read the current correlation ID.
 * - BullMQ schedulers call `getId()` to embed the ID into job data.
 * - BullMQ handlers call `run()` with the ID from job data to restore context.
 */
@Injectable()
export class CorrelationService {
  private readonly storage = new AsyncLocalStorage<CorrelationStore>();

  /**
   * Execute a callback within a correlation context.
   * All async code inside `fn` will inherit the correlationId.
   */
  run<T>(correlationId: string, fn: () => T): T {
    return this.storage.run({ correlationId }, fn);
  }

  /**
   * Get the current correlation ID, or undefined if called
   * outside a correlation context (e.g. startup code, cron jobs
   * without explicit context).
   */
  getId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  /**
   * Generate a new UUID v4 correlation ID.
   */
  generate(): string {
    return randomUUID();
  }
}
