// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface IUserRoleAssignment {
  id: number | null;
  userId: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
}
