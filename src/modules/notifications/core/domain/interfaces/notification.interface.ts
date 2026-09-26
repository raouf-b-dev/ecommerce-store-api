// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationPayload } from '../types/notification-payload.type';

export interface INotification {
  id: string;
  userId: string | null;
  targetRole: string | null;
  type: string;
  title: string;
  message: string;
  payload?: NotificationPayload;
  status: NotificationStatus;
  failedReason?: string | null;
  deliveredAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
}
