// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export type CreateFromEntity<T, ExcludeKeys extends keyof T = never> = Required<
  Omit<T, ExcludeKeys>
>;
