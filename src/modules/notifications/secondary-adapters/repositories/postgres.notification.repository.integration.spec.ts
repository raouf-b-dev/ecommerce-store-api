import { Notification } from '../../core/domain/entities/notification';
import { NotificationStatus } from '../../core/domain/enums/notification-status.enum';
import { PostgresNotificationRepository } from './postgres.notification.repository';
import { NotificationEntity } from '../orm/notification.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresNotificationRepository (Integration - Real DB)', () => {
  let repository: PostgresNotificationRepository;
  let seededData: SeededData;
  let userId: string;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();
    userId = String(seededData.customerUser.id);

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresNotificationRepository(
      dataSource.getRepository(NotificationEntity),
    );
  });

  const persist = async (
    overrides: Partial<{
      status: NotificationStatus;
      expiresAt: Date | null;
      userId: string;
    }> = {},
  ): Promise<Notification> => {
    const created = Notification.create({
      userId: overrides.userId ?? userId,
      targetRole: null,
      type: 'ORDER_CONFIRMED',
      title: 'Order confirmed',
      message: 'Your order was confirmed',
      expiresAt: overrides.expiresAt,
    });
    const notification =
      overrides.status === undefined
        ? created
        : Notification.fromPrimitives({
            ...created.toPrimitives(),
            status: overrides.status,
          });
    const saveResult = await repository.save(notification);
    ResultAssertionHelper.assertResultSuccess(saveResult);
    return notification;
  };

  it('save persists a notification and findById round-trips it', async () => {
    const notification = await persist();

    const found = await repository.findById(notification.id);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.title).toBe('Order confirmed');
    expect(found.value?.userId).toBe(userId);
  });

  it('findByUserId returns only that user and counts SENT as unread', async () => {
    await persist({ status: NotificationStatus.SENT });
    await persist({ status: NotificationStatus.READ });
    await persist({
      status: NotificationStatus.SENT,
      userId: String(seededData.adminUser.id),
    });

    const result = await repository.findByUserId(userId, {
      page: 1,
      limit: 10,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.total).toBe(2);
    expect(result.value.unread).toBe(1);
    expect(result.value.data.every((n) => n.userId === userId)).toBe(true);
  });

  it('markAsRead updates status for the owning user', async () => {
    const notification = await persist({ status: NotificationStatus.SENT });

    const markResult = await repository.markAsRead(notification.id, userId);
    ResultAssertionHelper.assertResultSuccess(markResult);

    const found = await repository.findById(notification.id);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.status).toBe(NotificationStatus.READ);
  });

  it('deleteExpired removes rows whose expiresAt is in the past', async () => {
    const expired = await persist({
      expiresAt: new Date(Date.now() - 60_000),
    });
    const active = await persist({
      expiresAt: new Date(Date.now() + 60_000),
    });

    const deleteResult = await repository.deleteExpired();
    ResultAssertionHelper.assertResultSuccess(deleteResult);

    const expiredFound = await repository.findById(expired.id);
    const activeFound = await repository.findById(active.id);
    ResultAssertionHelper.assertResultSuccess(expiredFound);
    ResultAssertionHelper.assertResultSuccess(activeFound);
    expect(expiredFound.value).toBeNull();
    expect(activeFound.value?.id).toBe(active.id);
  });
});
