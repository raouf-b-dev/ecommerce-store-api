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
} from 'src/modules/orders/testing';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import {
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

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

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

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

    const result = await useCase.execute({
      orderId,
      isSagaCompensation: true,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

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

  it('maps repository not-found to the same UseCaseError as GET order', async () => {
    const orderId = 1;
    mockRepository.mockOrderNotFound(orderId);

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order with id 1 not found',
      UseCaseError,
    );

    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  it('returns another RepositoryError unchanged with cause and retryable', async () => {
    const orderId = 1;
    const dbFailure = new RepositoryError(
      'Failed to find the order for update',
      {
        cause: new Error('connection reset'),
        retryable: true,
      },
    );
    const failureResult = Result.failure(dbFailure);
    mockRepository.findByIdForUpdate.mockResolvedValue(failureResult);

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

    expect(result).toBe(failureResult);
    expect(result).toMatchObject({
      isFailure: true,
      error: {
        message: 'Failed to find the order for update',
        retryable: true,
        cause: expect.any(Error),
      },
    });
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should return a failure result if the Order cannot be cancelled in current state', async () => {
    const orderId = 123;
    const nonCancellableOrder = OrderTestFactory.createCompletedOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFindByIdForUpdate(nonCancellableOrder);

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

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

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

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

    const result = await useCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Version conflict',
      RepositoryError,
    );
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
    expect(mockOrderScheduler.scheduleOrderStockRelease).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    const ownerContext = createUserCallerContext({
      userId: 2,
      role: 'CUSTOMER',
      permissions: new Set(['cancel_own_orders']),
    });
    const otherCustomerContext = createUserCallerContext({
      userId: 3,
      role: 'CUSTOMER',
      permissions: new Set(['cancel_own_orders']),
    });
    const viewOnlyOwnerContext = createUserCallerContext({
      userId: 2,
      role: 'CUSTOMER',
      permissions: new Set(['view_own_orders']),
    });
    const adminContext = createUserCallerContext({
      userId: 9,
      role: 'ADMIN',
      permissions: new Set(['manage_orders']),
    });

    it.each([
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CONFIRMED,
    ])('cancels when the owner cancels a %s order', async (status) => {
      const orderId = 1;
      const order = OrderTestFactory.createDomainOrder({
        id: orderId,
        userId: 2,
        status,
        paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        orderId,
        callerContext: ownerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('returns not found when a different customer tries to cancel', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createPendingPaymentOrder({
        id: orderId,
        userId: 2,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);

      const result = await useCase.execute({
        orderId,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
    });

    it('cancels any order when the caller has manage_orders', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createPendingPaymentOrder({
        id: orderId,
        userId: 2,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        orderId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
    });

    it('returns not found when the owner has only view_own_orders', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createPendingPaymentOrder({
        id: orderId,
        userId: 2,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);

      const result = await useCase.execute({
        orderId,
        callerContext: viewOnlyOwnerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns 409 when the owner cancels a PROCESSING order', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createDomainOrder({
        id: orderId,
        userId: 2,
        status: OrderStatus.PROCESSING,
        paymentId: 1,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);

      const result = await useCase.execute({
        orderId,
        callerContext: ownerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be cancelled in current state',
        DomainError,
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 409 },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('cancels a PROCESSING order when the caller has manage_orders', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createDomainOrder({
        id: orderId,
        userId: 2,
        status: OrderStatus.PROCESSING,
        paymentId: 1,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        orderId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
    });

    it('returns 409 when the owner cancels a shipped order', async () => {
      const orderId = 1;
      const order = OrderTestFactory.createDomainOrder({
        id: orderId,
        userId: 2,
        status: OrderStatus.SHIPPED,
      });
      mockRepository.mockSuccessfulFindByIdForUpdate(order);

      const result = await useCase.execute({
        orderId,
        callerContext: ownerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be cancelled in current state',
        DomainError,
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 409 },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
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

      const result = await useCase.execute({
        orderId: orderPrimitives.id!,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId: order.id!,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: 42,
        amount: paidOrder.getPricing().getTotalPriceMoney().toMajorUnits(),
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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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
            currency: 'USD',
          },
        ],
      });

      mockRepository.mockSuccessfulFindByIdForUpdate(zeroPaidOrder);

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(
        mockOrderScheduler.scheduleOrderStockRelease,
      ).not.toHaveBeenCalled();
      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
        orderId,
        paymentId: 42,
        amount: cancelledOrder.getPricing().getTotalPriceMoney().toMajorUnits(),
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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

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
          new InfrastructureError('queue down', { retryable: true }),
        );
      });

      it('saves the cancelled order and returns a retryable failure when enqueue fails', async () => {
        const result = await useCase.execute({
          orderId,
          callerContext: SYSTEM_CALLER_CONTEXT,
        });

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
        await useCase.execute({
          orderId,
          callerContext: SYSTEM_CALLER_CONTEXT,
        });

        // On retry, the order in DB is now CANCELLED with paymentId 42
        const cancelledOrder = OrderTestFactory.createDomainOrder({
          id: orderId,
          status: OrderStatus.CANCELLED,
          paymentId: 42,
        });
        mockRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

        const retryResult = await useCase.execute({
          orderId,
          callerContext: SYSTEM_CALLER_CONTEXT,
        });
        await useCase.execute({
          orderId,
          callerContext: SYSTEM_CALLER_CONTEXT,
        });

        ResultAssertionHelper.assertResultSuccess(retryResult);
        expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(
          3,
        );
        expect(mockOrderScheduler.jobs.size).toBe(1);
        expect([...mockOrderScheduler.jobs.values()]).toEqual([
          {
            orderId,
            paymentId: 42,
            amount: cancelledOrder
              .getPricing()
              .getTotalPriceMoney()
              .toMajorUnits(),
            reason: 'Order cancelled',
          },
        ]);
      });
    });
  });
});
