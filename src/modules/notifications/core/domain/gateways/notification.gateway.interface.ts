// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { NotificationPayload } from '../types/notification-payload.type';

export abstract class NotificationGateway {
  abstract send(userId: string, payload: NotificationPayload): Promise<void>;
}
