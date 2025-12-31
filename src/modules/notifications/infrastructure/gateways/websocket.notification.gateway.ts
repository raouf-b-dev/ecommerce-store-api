import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from '../../domain/gateways/notification.gateway.interface';
import { WebsocketConnectionGateway } from 'src/core/infrastructure/websocket/websocket.connection.gateway';

@Injectable()
export class WebsocketNotificationGateway implements NotificationGateway {
  private readonly logger = new Logger(WebsocketNotificationGateway.name);

  constructor(
    private readonly websocketConnectionGateway: WebsocketConnectionGateway,
  ) {}

  async send(userId: string, payload: any): Promise<void> {
    const roomName = `user_${userId}`;
    this.websocketConnectionGateway.server
      .to(roomName)
      .emit('notification', payload);
    this.logger.debug(`Sent notification to room ${roomName}`);
  }
}
