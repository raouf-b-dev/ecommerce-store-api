import { Test, TestingModule } from '@nestjs/testing';
import { HandlePaymentCompletedUseCase } from './handle-payment-completed.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  MockOrderRepository,
  MockOrderScheduler,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { ScheduleOrderRefundService } from '../../services/schedule-order-refund.service';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';

describe('HandlePaymentCompletedUseCase', () => {
  let useCase: HandlePaymentCompletedUseCase;
  let mockRepository: MockOrderRepository;
  let mockOrderScheduler: MockOrderScheduler;

  const orderId = 1;
  const paymentId = 100;
  const reservationId = 200;
  const cartId = 300;

  beforeEach(async () => {
    mockRepository = new MockOrderRepository();
    mockOrderScheduler = new MockOrderScheduler();
    mockOrderScheduler.schedulePostPayment.mockResolvedValue(
      Result.success('post-payment-job-id'),
    );
    mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
      Result.success('refund-job-id'),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandlePaymentCompletedUseCase,
        ScheduleOrderRefundService,
        { provide: OrderRepository, useValue: mockRepository },
        { provide: OrderScheduler, useValue: mockOrderScheduler },
      ],
    }).compile();

    useCase = module.get(HandlePaymentCompletedUseCase);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('confirms the order, saves it, and schedules post-payment when payment completes', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.findByIdForUpdate).toHaveBeenCalledWith(orderId);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).toHaveBeenCalledWith(
      orderId,
      reservationId,
      cartId,
    );
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('returns a retryable failure and schedules nothing when save fails', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSaveFailure('Database save failed');

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database save failed',
      RepositoryError,
    );
    expect(result.error.retryable).toBe(true);
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('skips save and scheduling when the same paymentId is already applied on a confirmed order', async () => {
    const orderPrimitives = OrderTestFactory.createMockOrder({
      id: orderId,
      status: OrderStatus.CONFIRMED,
      paymentId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('returns failure when order is not found', async () => {
    mockRepository.mockOrderNotFound(orderId);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      `Order not found: ${orderId}`,
      UseCaseError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('schedules a surplus remaining refund and saves nothing when status is PAYMENT_FAILED', async () => {
    const orderPrimitives = OrderTestFactory.createMockOrder({
      id: orderId,
      status: OrderStatus.PAYMENT_FAILED,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.PAYMENT_FAILED,
    });
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
      orderId,
      paymentId,
      mode: 'remaining',
      reason: 'Surplus payment refund',
    });
  });

  it('confirms order without scheduling post-payment when reservationId or cartId are omitted', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({
      orderId,
      paymentId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('logs error but returns success when schedulePostPayment fails after successful save', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();
    mockOrderScheduler.schedulePostPayment.mockResolvedValue(
      ErrorFactory.InfrastructureError('Queue service unavailable'),
    );

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).toHaveBeenCalledWith(
      orderId,
      reservationId,
      cartId,
    );
  });

  describe('surplus payment', () => {
    const surplusPaymentId = 999;

    it('schedules a remaining refund and saves nothing when a different payment completes on CONFIRMED', async () => {
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
        reservationId,
        cartId,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId,
        status: OrderStatus.CONFIRMED,
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(1);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: surplusPaymentId,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });
    });

    it('dedupes to one refund job when the same surplus event is replayed', async () => {
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
      const dedupeScheduler = new MockOrderScheduler();
      mockOrderScheduler.scheduleRefundPayment.mockImplementation((props) =>
        dedupeScheduler.scheduleRefundPayment(props),
      );

      const first = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
      });
      const second = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
      });

      ResultAssertionHelper.assertResultSuccess(first);
      ResultAssertionHelper.assertResultSuccess(second);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(2);
      expect(dedupeScheduler.jobs.size).toBe(1);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('schedules two refund jobs when two different surplus payments complete on the same order', async () => {
      const firstSurplusPaymentId = 901;
      const secondSurplusPaymentId = 902;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
      const dedupeScheduler = new MockOrderScheduler();
      mockOrderScheduler.scheduleRefundPayment.mockImplementation((props) =>
        dedupeScheduler.scheduleRefundPayment(props),
      );

      const first = await useCase.execute({
        orderId,
        paymentId: firstSurplusPaymentId,
      });
      const second = await useCase.execute({
        orderId,
        paymentId: secondSurplusPaymentId,
      });

      ResultAssertionHelper.assertResultSuccess(first);
      ResultAssertionHelper.assertResultSuccess(second);
      expect(first.value).toEqual({
        orderId,
        status: OrderStatus.CONFIRMED,
      });
      expect(second.value).toEqual({
        orderId,
        status: OrderStatus.CONFIRMED,
      });
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(2);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: firstSurplusPaymentId,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: secondSurplusPaymentId,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });
      expect(dedupeScheduler.jobs.size).toBe(2);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns a retryable failure when surplus refund scheduling fails retryably', async () => {
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        Result.failure(
          new InfrastructureError('Queue connection refused', {
            retryable: true,
          }),
        ),
      );

      const result = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule surplus payment refund',
        UseCaseError,
      );
      expect(result.error.retryable).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns a non-retryable failure when surplus refund scheduling fails non-retryably', async () => {
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        Result.failure(
          new InfrastructureError('Invalid payload', { retryable: false }),
        ),
      );

      const result = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule surplus payment refund',
        UseCaseError,
      );
      expect(result.error.retryable).toBe(false);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns success without refund when settled order has null paymentId', async () => {
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId: null,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        paymentId: surplusPaymentId,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId,
        status: OrderStatus.CONFIRMED,
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    });
  });

  describe('when the order is already CANCELLED', () => {
    it('records the payment, keeps CANCELLED, and schedules exactly one refund', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        orderId,
        paymentId,
        reservationId,
        cartId,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId,
        status: OrderStatus.CANCELLED,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CANCELLED,
          paymentId,
        }),
        expect.any(Number),
      );
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(1);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId,
        amount: cancelledOrder.getPricing().getTotalPriceMoney().toMajorUnits(),
        reason: 'Payment completed after order cancellation',
      });
      expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
    });

    it('saves before scheduling the refund', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockRepository.mockSuccessfulSave();

      await useCase.execute({
        orderId,
        paymentId,
        reservationId,
        cartId,
      });

      expect(mockRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
        mockOrderScheduler.scheduleRefundPayment.mock.invocationCallOrder[0],
      );
    });

    it('returns the save failure and schedules no refund when save fails', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockRepository.mockSaveFailure('Database save failed');

      const result = await useCase.execute({
        orderId,
        paymentId,
        reservationId,
        cartId,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database save failed',
        RepositoryError,
      );
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
    });

    it('returns a retryable failure after save when refund scheduling fails', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockRepository.mockSuccessfulSave();
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        Result.failure(
          new InfrastructureError('Queue connection refused', {
            retryable: true,
          }),
        ),
      );

      const result = await useCase.execute({
        orderId,
        paymentId,
        reservationId,
        cartId,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cancelled but the refund could not be scheduled',
        UseCaseError,
      );
      expect(result.error.retryable).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
    });

    it('still schedules a refund when paymentId is already recorded', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        orderId,
        paymentId,
        reservationId,
        cartId,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId,
        status: OrderStatus.CANCELLED,
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(1);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId,
        amount: cancelledOrder.getPricing().getTotalPriceMoney().toMajorUnits(),
        reason: 'Payment completed after order cancellation',
      });
    });

    it('schedules a surplus remaining refund without saving when a different payment completes', async () => {
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

      const result = await useCase.execute({
        orderId,
        paymentId: 999,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId,
        status: OrderStatus.CANCELLED,
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: 999,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });
    });
  });
});
