// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Driven port for process lifecycle signals (e.g. graceful shutdown).
 * Application code depends on this port - not on Nest/infra ShutdownService.
 * Implemented by {@link ShutdownService} in infrastructure.
 */
export abstract class ApplicationLifecyclePort {
  abstract get isShuttingDown(): boolean;
}
