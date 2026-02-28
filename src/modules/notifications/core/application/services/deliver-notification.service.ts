import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification';
import { NotificationGateway } from '../../domain/gateways/notification.gateway.interface';

@Injectable()
export class DeliverNotificationService {
  private readonly logger = new Logger(DeliverNotificationService.name);

  constructor(private readonly notificationGateway: NotificationGateway) {}

  async execute(notification: Notification): Promise<void> {
    try {
      if (!notification.userId) {
        this.logger.warn(
          `Notification ${notification.id} has no userId, skipping WebSocket delivery`,
        );
        return;
      }

      await this.notificationGateway.send(notification.userId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        payload: notification.payload,
        createdAt: notification.createdAt,
      });
      this.logger.log(
        `Notification ${notification.id} delivered to user ${notification.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification ${notification.id}: ${error.message}`,
      );
      throw error;
    }
  }
}
