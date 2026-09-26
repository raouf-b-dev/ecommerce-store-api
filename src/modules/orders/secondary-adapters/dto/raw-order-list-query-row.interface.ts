// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Represents the raw query result row returned by the TypeORM query builder
 * when selecting flat order list projections across cross-context JOINs.
 */
export interface RawOrderListQueryRow {
  id: number | string;
  userId: number | string;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  itemCount: number | string;
  totalAmount: number | string;
  createdAt: Date | string;
}
