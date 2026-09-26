// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export const INTEGRATION_TEST_DB_CONSTANTS = {
  POSTGRES_IMAGE: process.env.POSTGRES_IMAGE || 'postgres:18.4-alpine',
  DB_NAME: 'ecommerce_store_test_integration',
  DB_USER: 'test_user',
  DB_PASS: 'test_pass',
  CONTAINER_STARTUP_TIMEOUT_MS: 180000,
};
