// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * URI default API version. Single source of truth for Nest `defaultVersion`,
 * cookie Path, and E2E prefixes. v2 routes should set their own cookie path;
 * do not retarget v1 cookies to a newer version.
 */
export const DEFAULT_API_VERSION = '1';

export const DEFAULT_API_PREFIX = `/v${DEFAULT_API_VERSION}`;
