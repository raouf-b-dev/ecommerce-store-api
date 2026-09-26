// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface RawUserListQueryRow {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean | number | string;
  roleCode?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  addressCount?: number | string;
}
