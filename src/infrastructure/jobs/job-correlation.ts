// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export function readJobCorrelationId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  if (!('correlationId' in data)) {
    return undefined;
  }

  const { correlationId } = data;
  return typeof correlationId === 'string' ? correlationId : undefined;
}
