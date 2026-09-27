export abstract class DomainEventPublisher {
  abstract publish<T = unknown>(eventName: string, payload: T): void;
}
