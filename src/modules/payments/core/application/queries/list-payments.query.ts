// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: string;
  userId?: number;
  requestedUserId?: number;
  authorizedUserId?: number;
  orderId?: number;
  userEmail?: string;
  userName?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
