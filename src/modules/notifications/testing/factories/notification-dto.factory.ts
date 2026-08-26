import { NotificationListItemDTO } from '../../core/application/queries/results/notification-list-item.result';
import { RawNotificationListQueryRow } from '../../secondary-adapters/dto/raw-notification-list-query-row.interface';
import { Notification } from '../../core/domain/entities/notification';
import { NotificationStatus } from '../../core/domain/enums/notification-status.enum';

export class NotificationDtoTestFactory {
  static createRawNotificationListQueryRow(
    overrides?: Partial<RawNotificationListQueryRow>,
  ): RawNotificationListQueryRow {
    return {
      id: 'n123',
      userId: '10',
      targetRole: 'CUSTOMER',
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: 'Your order #123 has been confirmed.',
      payload: { orderId: 123 },
      status: 'delivered',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createNotificationListItemDTO(
    overrides?: Partial<NotificationListItemDTO>,
  ): NotificationListItemDTO {
    return {
      id: 'n123',
      userId: '10',
      targetRole: 'CUSTOMER',
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: 'Your order #123 has been confirmed.',
      payload: { orderId: 123 },
      status: 'delivered',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createEntity(
    overrides?: Partial<Parameters<typeof Notification.fromPrimitives>[0]>,
  ): Notification {
    return Notification.fromPrimitives({
      id: 'n123',
      userId: '10',
      targetRole: 'CUSTOMER',
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: 'Your order #123 has been confirmed.',
      payload: { orderId: 123 },
      status: NotificationStatus.PENDING,
      failedReason: null,
      deliveredAt: null,
      expiresAt: new Date('2024-02-01T00:00:00.000Z'),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    });
  }
}
