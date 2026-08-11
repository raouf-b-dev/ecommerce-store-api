import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresNotificationQueryAdapter } from './postgres-notification-query.adapter';
import { NotificationEntity } from '../orm/notification.schema';

describe('PostgresNotificationQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresNotificationQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const notifRepo = IntegrationTestHelper.getRepository(NotificationEntity);
    queryAdapter = new PostgresNotificationQueryAdapter(notifRepo);
  });

  const createNotificationRow = async (
    overrides: Partial<NotificationEntity> = {},
  ): Promise<NotificationEntity> => {
    const notifRepo = IntegrationTestHelper.getRepository(NotificationEntity);
    return await notifRepo.save({
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: String(seededData.customerUser.id),
      targetRole: null,
      type: 'ORDER_CREATED',
      title: 'Order Created',
      message: 'Your order has been created successfully',
      payload: null,
      status: 'SENT',
      failedReason: null,
      deliveredAt: null,
      expiresAt: null,
      createdAt: new Date(),
      ...overrides,
    });
  };

  it('lists notifications filtered by userId with pagination', async () => {
    await createNotificationRow();

    const result = await queryAdapter.list({
      page: 1,
      limit: 10,
      userId: String(seededData.customerUser.id),
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].title).toBe('Order Created');
  });

  it('fetches notification item DTO by ID', async () => {
    const notif = await createNotificationRow();

    const result = await queryAdapter.getById(notif.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(notif.id);
    expect(result.value?.title).toBe('Order Created');
  });
});
