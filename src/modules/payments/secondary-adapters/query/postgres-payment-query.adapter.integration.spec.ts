import { PaymentEntityTestFactory } from 'src/modules/payments/testing';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresPaymentQueryAdapter } from './postgres-payment-query.adapter';
import { PaymentEntity } from '../orm/payment.schema';

describe('PostgresPaymentQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresPaymentQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const paymentRepo = IntegrationTestHelper.getRepository(PaymentEntity);
    queryAdapter = new PostgresPaymentQueryAdapter(paymentRepo);
  });

  const createPaymentRow = async (
    overrides: Partial<PaymentEntity> = {},
  ): Promise<PaymentEntity> => {
    const paymentRepo = IntegrationTestHelper.getRepository(PaymentEntity);
    const unsavedEntity = PaymentEntityTestFactory.createUnsavedPaymentEntity({
      orderId: 101,
      userId: seededData.customerUser.id,
      amount: 1200.0,
      currency: 'USD',
      ...overrides,
    });
    return await paymentRepo.save(paymentRepo.create(unsavedEntity));
  };

  it('lists payments with resolved customer name and email in single query', async () => {
    await createPaymentRow();

    const result = await queryAdapter.list({ page: 1, limit: 10 });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].userName).toBe('Customer One');
    expect(result.value.items[0].userEmail).toBe(
      'customer.integration@example.com',
    );
  });

  it('filters payments strictly by authorizedUserId ownership scope', async () => {
    const payment = await createPaymentRow({
      userId: seededData.customerUser.id,
    });
    await createPaymentRow({ userId: seededData.adminUser.id, orderId: 102 });

    const result = await queryAdapter.list({
      page: 1,
      limit: 10,
      authorizedUserId: seededData.customerUser.id,
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].id).toBe(payment.id);
  });

  it('fetches payment detail by orderId', async () => {
    const payment = await createPaymentRow({ orderId: 505 });

    const result = await queryAdapter.getByOrderId(505);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(payment.id);
    expect(result.value?.orderId).toBe(505);
  });
});
