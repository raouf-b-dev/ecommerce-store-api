import { NotificationDtoTestFactory } from 'src/modules/notifications/testing';
import { NotificationQueryMapper } from './notification-query.mapper';

describe('NotificationQueryMapper', () => {
  it('maps complete raw notification row to NotificationListItemDTO', () => {
    const rawRow = NotificationDtoTestFactory.createRawNotificationListQueryRow(
      {
        id: '10',
        userId: '42',
        targetRole: null,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order #100 has been confirmed',
        payload: { orderId: 100 },
        status: 'SENT',
        createdAt: new Date('2026-08-11T12:00:00.000Z'),
      },
    );

    const dto = NotificationQueryMapper.toListItemDto(rawRow);

    expect(dto).toEqual({
      id: '10',
      userId: '42',
      targetRole: null,
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: 'Your order #100 has been confirmed',
      payload: { orderId: 100 },
      status: 'SENT',
      createdAt: '2026-08-11T12:00:00.000Z',
    });
  });

  it('handles null optional fields and missing fallback values safely', () => {
    const rawRow = NotificationDtoTestFactory.createRawNotificationListQueryRow(
      {
        id: '11',
        userId: null,
        targetRole: 'ADMIN',
        type: 'SYSTEM_ALERT',
        title: 'System Alert',
        message: 'Maintenance scheduled',
        payload: null,
        status: 'PENDING',
        createdAt: '2026-08-11T12:00:00.000Z' as unknown as Date,
      },
    );

    const dto = NotificationQueryMapper.toListItemDto(rawRow);

    expect(dto.id).toBe('11');
    expect(dto.userId).toBeNull();
    expect(dto.targetRole).toBe('ADMIN');
    expect(dto.payload).toBeNull();
    expect(dto.createdAt).toBe('2026-08-11T12:00:00.000Z');
  });
});
