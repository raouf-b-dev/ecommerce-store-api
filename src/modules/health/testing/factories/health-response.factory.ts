// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export function createUpResponse(key: string) {
  return { [key]: { status: 'up' } };
}
