// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { isRecord } from '../../shared-kernel/infra/lang/is-record';

export function firstChildValue(
  childrenValues: Record<string, unknown>,
): unknown {
  return Object.values(childrenValues)[0];
}

export function readNumberProperty(
  value: unknown,
  key: string,
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const property = value[key];
  return typeof property === 'number' ? property : undefined;
}
