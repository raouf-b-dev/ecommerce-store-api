// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  targetRole?: string;
  status?: string;
}
