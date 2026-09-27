// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __INTEGRATION_POSTGRES_CONTAINER__:
    StartedPostgreSqlContainer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  if (!globalThis.__INTEGRATION_POSTGRES_CONTAINER__) {
    return;
  }

  console.log('\n[Integration Testing] Stopping PostgreSQL Testcontainer...');
  await globalThis.__INTEGRATION_POSTGRES_CONTAINER__.stop();
  globalThis.__INTEGRATION_POSTGRES_CONTAINER__ = undefined;
}
