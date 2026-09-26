// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  roleCode?: string;
  authorizedUserId?: number;
}
