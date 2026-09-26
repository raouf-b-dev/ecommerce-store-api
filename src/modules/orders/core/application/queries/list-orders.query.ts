// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { OrderStatus } from '../../domain/value-objects/order-status';

export interface ListOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus | string;
  userId?: number;
  requestedUserId?: number;
  authorizedUserId?: number;
  userEmail?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
  minAmount?: number;
  maxAmount?: number;
}
