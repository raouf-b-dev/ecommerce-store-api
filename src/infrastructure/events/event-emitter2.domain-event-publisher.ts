import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventPublisher } from '../../shared-kernel/domain/interfaces/domain-event-publisher';

/**
 * Infrastructure adapter — wraps @nestjs/event-emitter for
 * in-process domain event delivery.
 *
 * Swap this adapter to switch to Kafka, RabbitMQ, etc.,
 * without touching any Use Case or domain code.
 */
@Injectable()
export class EventEmitter2DomainEventPublisher implements DomainEventPublisher {
  private readonly logger = new Logger(EventEmitter2DomainEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish<T = unknown>(eventName: string, payload: T): void {
    // Fire-and-forget semantics: don't let a bad listener crash the use case
    this.eventEmitter.emitAsync(eventName, payload).catch((error) => {
      this.logger.error(
        `Failed to process domain event [${eventName}]: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }
}
