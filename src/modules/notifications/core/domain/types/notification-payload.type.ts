// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Strongly-typed payload for notifications.
 * Using Record<string, unknown> instead of `any` preserves
 * domain layer purity while remaining flexible for various notification types.
 */
export type NotificationPayload = Record<string, unknown>;
