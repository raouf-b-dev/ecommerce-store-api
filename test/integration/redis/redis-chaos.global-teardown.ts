// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export default async function globalTeardown(): Promise<void> {
  const container = globalThis.__CHAOS_REDIS_CONTAINER__;
  if (!container) return;

  console.log('\n[Redis Chaos] Stopping Redis Stack Testcontainer...');
  await container.stop();
  globalThis.__CHAOS_REDIS_CONTAINER__ = undefined;
}
