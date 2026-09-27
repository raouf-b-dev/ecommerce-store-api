// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  roleCode?: string;
  authorizedUserId?: number;
}
