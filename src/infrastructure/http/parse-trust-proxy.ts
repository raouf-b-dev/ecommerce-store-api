// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export type TrustProxySetting = boolean | number | string;

export function parseTrustProxy(value: string): TrustProxySetting {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const hops = Number(trimmed);
  if (!Number.isNaN(hops)) return hops;

  return trimmed;
}
