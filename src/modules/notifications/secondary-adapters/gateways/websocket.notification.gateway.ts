// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from '../../core/domain/gateways/notification.gateway.interface';
import { NotificationPayload } from '../../core/domain/types/notification-payload.type';
import { WebsocketConnectionGateway } from 'src/infrastructure/websocket/websocket.connection.gateway';

@Injectable()
export class WebsocketNotificationGateway implements NotificationGateway {
  private readonly logger = new Logger(WebsocketNotificationGateway.name);

  constructor(
    private readonly websocketConnectionGateway: WebsocketConnectionGateway,
  ) {}

  send(userId: string, payload: NotificationPayload): Promise<void> {
    const roomName = `user_${userId}`;
    this.websocketConnectionGateway.server
      .to(roomName)
      .emit('notification', payload);
    this.logger.debug(`Sent notification to room ${roomName}`);
    return Promise.resolve();
  }
}
