// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * OpenTelemetry Tracing Infrastructure
 *
 * Tracing is bootstrapped via the --require flag before the NestJS application starts.
 * See src/infrastructure/tracing/tracing.ts for the SDK configuration.
 *
 * This barrel export exists for any future NestJS-integrated tracing utilities
 * such as custom decorators, span helpers, or interceptors.
 */
export * from './tracing';
