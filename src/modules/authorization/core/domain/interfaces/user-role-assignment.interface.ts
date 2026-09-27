// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface IUserRoleAssignment {
  id: number | null;
  userId: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
}
