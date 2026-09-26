// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export abstract class DomainEventPublisher {
  abstract publish<T = unknown>(eventName: string, payload: T): void;
}
