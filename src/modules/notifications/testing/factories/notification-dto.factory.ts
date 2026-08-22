import { NotificationListItemDTO } from '../../core/application/queries/results/notification-list-item.result';
import { RawNotificationListQueryRow } from '../../secondary-adapters/dto/raw-notification-list-query-row.interface';

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
}
