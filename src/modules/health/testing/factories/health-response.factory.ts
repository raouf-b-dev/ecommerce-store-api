// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export function createUpResponse(key: string) {
  return { [key]: { status: 'up' } };
}
