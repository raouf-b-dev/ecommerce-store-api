// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export type CreateFromEntity<T, ExcludeKeys extends keyof T = never> = Required<
  Omit<T, ExcludeKeys>
>;
