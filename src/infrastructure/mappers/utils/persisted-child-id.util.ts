// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/** Omit PK on insert when domain id is unset or legacy `0`. */
export function persistedChildId(
  id: number | null | undefined,
): number | undefined {
  if (id == null || id <= 0) {
    return undefined;
  }
  return id;
}

export function stripUnsetChildId<T extends { id?: number }>(entity: T): T {
  const persisted = persistedChildId(entity.id);
  if (persisted === undefined) {
    delete entity.id;
  } else {
    entity.id = persisted;
  }
  return entity;
}
