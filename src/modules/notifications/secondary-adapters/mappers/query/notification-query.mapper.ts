// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { NotificationListItemDTO } from '../../../core/application/queries/results/notification-list-item.result';
import { RawNotificationListQueryRow } from '../../dto/raw-notification-list-query-row.interface';

export class NotificationQueryMapper {
  static toListItemDto(
    row: RawNotificationListQueryRow,
  ): NotificationListItemDTO {
    return {
      id: String(row.id),
      userId: row.userId || null,
      targetRole: row.targetRole || null,
      type: String(row.type || ''),
      title: String(row.title || ''),
      message: String(row.message || ''),
      payload: row.payload || null,
      status: String(row.status || 'pending'),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  }
}
