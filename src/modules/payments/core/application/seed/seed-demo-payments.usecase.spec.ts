import { MockPaymentRepository } from 'src/modules/payments/testing';
import { SeedDemoPaymentsUseCase } from './seed-demo-payments.usecase';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { PaymentTestFactory } from '../../../testing/factories/payment.test.factory';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';
import { Payment } from '../../domain/entities/payment';
import { Result } from '../../../../../shared-kernel/domain/result';

describe('SeedDemoPaymentsUseCase', () => {
  let useCase: SeedDemoPaymentsUseCase;
  let mockPaymentRepository: MockPaymentRepository;

  const createdAt = new Date('2026-08-30T12:00:00.000Z');

  beforeEach(() => {
    mockPaymentRepository = new MockPaymentRepository();
    useCase = new SeedDemoPaymentsUseCase(mockPaymentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates CAPTURED payments and a partial refund when requested', async () => {
    mockPaymentRepository.mockSuccessfulFindByOrderId([]);
    mockPaymentRepository.save.mockImplementation(async (payment: Payment) =>
      Result.success(
        Payment.fromPrimitives({ ...payment.toPrimitives(), id: 42 }),
      ),
    );
    mockPaymentRepository.update.mockImplementation(async (payment: Payment) =>
      Result.success(payment),
    );

    const result = await useCase.execute([
      {
        orderId: 10,
        userId: 1,
        amount: 61,
        currency: 'USD',
        paymentMethod: PaymentMethodType.STRIPE,
        createdAt,
        withPartialRefundAmount: 20,
      },
    ]);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value[0]).toEqual({
      orderId: 10,
      paymentId: 42,
      seedStatus: 'created',
    });
    expect(mockPaymentRepository.save).toHaveBeenCalledTimes(1);
    expect(mockPaymentRepository.update).toHaveBeenCalledTimes(1);
    const updated = mockPaymentRepository.update.mock.calls[0][0];
    expect(updated.status).toBe(PaymentStatusType.PARTIALLY_REFUNDED);
    expect(updated.refundedAmount).toBe(20);
  });

  it('refreshes timestamps when a payment already exists for the order', async () => {
    const existing = PaymentTestFactory.createMockPayment({
      id: 7,
      orderId: 10,
      amount: 61,
      status: PaymentStatusType.CAPTURED,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    mockPaymentRepository.mockSuccessfulFindByOrderId([existing]);
    mockPaymentRepository.update.mockImplementation(async (payment: Payment) =>
      Result.success(payment),
    );

    const result = await useCase.execute([
      {
        orderId: 10,
        userId: 1,
        amount: 61,
        currency: 'USD',
        paymentMethod: PaymentMethodType.STRIPE,
        createdAt,
      },
    ]);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value[0].seedStatus).toBe('updated');
    expect(result.value[0].paymentId).toBe(7);
    const updated = mockPaymentRepository.update.mock.calls[0][0];
    expect(updated.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(mockPaymentRepository.save).not.toHaveBeenCalled();
  });
});
