// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export abstract class DomainEventPublisher {
  abstract publish<T = unknown>(eventName: string, payload: T): void;
}
