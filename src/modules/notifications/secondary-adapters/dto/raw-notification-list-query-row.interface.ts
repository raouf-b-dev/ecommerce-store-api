// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface RawNotificationListQueryRow {
  id: string;
  userId?: string | null;
  targetRole?: string | null;
  type: string;
  title: string;
  message: string;
  payload?: any;
  status: string;
  createdAt: Date | string;
}
