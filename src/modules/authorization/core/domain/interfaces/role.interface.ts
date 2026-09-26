// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface IRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: { codes: string[] };
  createdAt: Date;
  updatedAt: Date;
}
