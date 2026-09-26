// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface PollUntilOptions {
  timeoutMs?: number;
  intervalMs?: number;
  description?: string;
}

export async function pollUntil<T>(
  probe: () => Promise<T | null | undefined | false>,
  options: PollUntilOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const description = options.description ?? 'condition';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await probe();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}`);
}
