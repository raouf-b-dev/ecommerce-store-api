// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

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
