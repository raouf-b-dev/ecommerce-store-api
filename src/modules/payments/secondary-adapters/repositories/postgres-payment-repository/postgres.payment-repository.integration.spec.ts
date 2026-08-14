import {
  PaymentTestFactory,
  RefundTestFactory,
} from 'src/modules/payments/testing';
import { PostgresPaymentRepository } from './postgres.payment-repository';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresPaymentRepository (Integration - Real DB)', () => {
  let repository: PostgresPaymentRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresPaymentRepository(
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(RefundEntity),
      dataSource,
    );
  });

  const persistPayment = async (orderId = 9001) => {
    const payment = PaymentTestFactory.createDomainPayment({
      id: null,
      orderId,
      userId: seededData.customerUser.id,
      transactionId: `tx-${orderId}`,
    });
    const result = await repository.save(payment);
    ResultAssertionHelper.assertResultSuccess(result);
    return result.value;
  };

  it('save persists a payment in a transaction and findById returns it', async () => {
    const saved = await persistPayment();

    const found = await repository.findById(saved.id!);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value.orderId).toBe(9001);
    expect(found.value.userId).toBe(seededData.customerUser.id);
  });

  it('findByOrderId returns payments for that order only', async () => {
    await persistPayment(9001);
    await persistPayment(9002);

    const result = await repository.findByOrderId(9001);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].orderId).toBe(9001);
  });

  it('saveRefund persists a refund against an existing payment', async () => {
    const payment = await persistPayment(9100);
    const refund = RefundTestFactory.createDomainRefund({
      id: null,
      paymentId: payment.id!,
      amount: 25,
    });

    const result = await repository.saveRefund(refund);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentId).toBe(payment.id);

    const loaded = await repository.findRefundById(result.value.id!);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(Number(loaded.value.amount)).toBe(25);
  });
});
