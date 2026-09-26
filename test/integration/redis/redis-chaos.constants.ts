// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export const REDIS_CHAOS_CONSTANTS = {
  REDIS_IMAGE: process.env.REDIS_IMAGE || 'redis/redis-stack:7.2.0-v18',
  CONTAINER_STARTUP_TIMEOUT_MS: 180000,
  KEY_PREFIX: 'chaos:',
};
