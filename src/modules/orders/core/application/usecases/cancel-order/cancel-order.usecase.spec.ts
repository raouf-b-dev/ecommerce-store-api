import { CancelOrderUseCase } from './cancel-order.usecase';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  MockOrderRepository,
  MockOrderScheduler,
  OrderBuilder,
  OrderTestFactory,
  getRefundJobId,
} from 'src/modules/orders/testing';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';

describe('CancelOrderUseCase', () => {
  let useCase: CancelOrderUseCase;
  let mockRepository: MockOrderRepository;
  let mockOrderScheduler: MockOrderScheduler;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(() => {
    mockRepository = new MockOrderRepository();
    mockOrderScheduler = new MockOrderScheduler();
    mockOrderScheduler.scheduleOrderStockRelease.mockResolvedValue(
      Result.success('job-id'),
    );
    domainEventPublisher = { publish: jest.fn() };
    useCase = new CancelOrderUseCase(
      mockRepository,
      mockOrderScheduler,
      domainEventPublisher,
    );
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('should cancel the order and return its data on success', async () => {
    const orderId = 1;
    const cancellableOrder = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(cancellableOrder);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({ orderId });

    expect(mockRepository.findByIdForUpdate).toHaveBeenCalledWith(orderId);
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).toHaveBeenCalledWith(
      orderId,
    );
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.status).toBe(OrderStatus.CANCELLED);
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('should publish saga compensation events if requested', async () => {
    const orderId = 1;
    const cancellableOrder = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(cancellableOrder);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({ orderId, isSagaCompensation: true });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'checkout.saga.compensation',
      { step: 'cancel-order', orderId },
    );
    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'checkout.saga.failed',
      { orderId },
    );
  });

  it('should return a failure result if the order is not found', async () => {
    const orderId = 1;
    mockRepository.mockOrderNotFound(orderId);

    const result = await useCase.execute({ orderId });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order with id 1 not found',
      RepositoryError,
    );

    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  it('should return a failure result if the Order cannot be cancelled in current state', async () => {
    const orderId = 123;
    const nonCancellableOrder = OrderTestFactory.createCompletedOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(nonCancellableOrder);

    const result = await useCase.execute({ orderId });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order cannot be cancelled in current state',
      DomainError,
    );

    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  it('should return a failure result if the repository fails to save the cancellation', async () => {
    const orderId = 1;
    const cancellableOrder = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(cancellableOrder);
    mockRepository.mockSaveFailure('DB write failed');

    const result = await useCase.execute({ orderId });

    ResultAssertionHelper.assertResultFailure(
      result,
      'DB write failed',
      RepositoryError,
    );
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  it('does not schedule refund or stock release if save fails on paid CONFIRMED order', async () => {
    const orderId = 1;
    const paidOrder = OrderTestFactory.createDomainOrder({
      id: orderId,
      status: OrderStatus.CONFIRMED,
      paymentId: 42,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(paidOrder);
    mockRepository.mockSaveFailure('Version conflict');

    const result = await useCase.execute({ orderId });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Version conflict',
      RepositoryError,
    );
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  describe('complex scenarios', () => {
    it('should cancel multi-item order successfully', async () => {
      const orderPrimitives = new OrderBuilder()
        .withId(1)
        .withItems(5)
        .asCancellable()
        .build();

      mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({ orderId: orderPrimitives.id! });

      // Test the outcome
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
      expect(result.value.id).toBe(1);
      expect(mockRepository.findByIdForUpdate).toHaveBeenCalledWith(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should not cancel shipped order', async () => {
      const order = new OrderBuilder().withId(1).asNonCancellable().build();

      mockRepository.mockSuccessfulFindByIdForUpdate(order);

      const result = await useCase.execute({ orderId: order.id! });

      ResultAssertionHelper.assertResultFailure(result);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('triggers a refund for a paid order', async () => {
      const orderId = 1;
      const paidOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId: 42,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(paidOrder);
      mockRepository.mockSuccessfulSave();
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        Result.success('refund-job-id'),
      );

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: 42,
        amount: paidOrder.totalPrice,
        reason: 'Order cancelled',
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('does not trigger a refund for an unpaid order', async () => {
      const orderId = 1;
      const unpaidOrder = OrderTestFactory.createPendingPaymentOrder({
        id: orderId,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(unpaidOrder);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    });

    it('fails when paid order has totalPrice 0 without refund or save', async () => {
      const orderId = 1;
      const zeroPaidOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId: 42,
        items: [
          {
            id: 1,
            productId: 1,
            productName: 'Free item',
            quantity: 1,
            unitPrice: 0,
          },
        ],
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(zeroPaidOrder);

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Refund amount must be greater than zero',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    });

    it('re-queues refund when cancelling an already CANCELLED order with paymentId', async () => {
      const orderId = 1;
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        Result.success('refund-job-id'),
      );

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: 42,
        amount: cancelledOrder.totalPrice,
        reason: 'Order cancelled',
      });
    });

    it('returns 500 when re-queuing refund fails on already CANCELLED order with paymentId', async () => {
      const orderId = 1;
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        ErrorFactory.InfrastructureError('Queue connection refused'),
      );

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cancelled but the refund could not be scheduled',
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 500 },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('does nothing when order is already CANCELLED without paymentId', async () => {
      const orderId = 1;
      const cancelledOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    });

    it('rejects cancellation of a shipped order with 409 Conflict', async () => {
      const orderId = 1;
      const shippedOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.SHIPPED,
        paymentId: 42,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(shippedOrder);

      const result = await useCase.execute({ orderId });

      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 409 },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    });

    it('returns 500 with order saved when refund cannot be enqueued', async () => {
      const orderId = 1;
      const paidOrder = OrderTestFactory.createDomainOrder({
        id: orderId,
        status: OrderStatus.CONFIRMED,
        paymentId: 42,
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(paidOrder);
      mockRepository.mockSuccessfulSave();
      mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
        ErrorFactory.InfrastructureError('Queue down'),
      );

      const result = await useCase.execute({ orderId });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cancelled but the refund could not be scheduled',
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 500 },
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    describe('when the refund cannot be queued (failure injection)', () => {
      const orderId = 1;

      beforeEach(() => {
        const paidOrder = OrderTestFactory.createDomainOrder({
          id: orderId,
          status: OrderStatus.CONFIRMED,
          paymentId: 42,
        });

        mockRepository.mockSuccessfulFindByIdForUpdate(paidOrder);
        mockRepository.mockSuccessfulSave();
        mockOrderScheduler.failNext(
          new InfrastructureError('queue down', undefined, undefined, true),
        );
      });

      it('saves the cancelled order and returns a retryable failure when enqueue fails', async () => {
        const result = await useCase.execute({ orderId });

        expect(result).toMatchObject({
          isFailure: true,
          error: { retryable: true },
        });
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: OrderStatus.CANCELLED }),
          expect.any(Number),
        );
        expect(mockOrderScheduler.jobs.size).toBe(0);
      });

      it('creates exactly one refund job when the cancel is retried', async () => {
        // Run 1: enqueue fails after order is saved
        await useCase.execute({ orderId });

        // On retry, the order in DB is now CANCELLED with paymentId 42
        const cancelledOrder = OrderTestFactory.createDomainOrder({
          id: orderId,
          status: OrderStatus.CANCELLED,
          paymentId: 42,
        });
        mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

        const retryResult = await useCase.execute({ orderId });
        await useCase.execute({ orderId });

        ResultAssertionHelper.assertResultSuccess(retryResult);
        expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(
          3,
        );
        expect([...mockOrderScheduler.jobs.keys()]).toEqual([
          getRefundJobId(orderId),
        ]);
      });
    });
  });
});
