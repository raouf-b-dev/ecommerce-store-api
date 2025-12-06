// src/modules/orders/application/usecases/ship-order/ship-order.usecase.spec.ts
import { ShipOrderUseCase } from './ship-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { DomainError } from '../../../../../core/errors/domain.error';
import { PaymentMethodType } from '../../../../payments/domain';

describe('ShipOrderUseCase', () => {
  let useCase: ShipOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new ShipOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if order is shipped', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();

      mockOrderRepository.mockSuccessfulFind(processingOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(processingOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
      expect(result.value.id).toBe(processingOrder.id);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        processingOrder.id,
      );
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        processingOrder.id,
        OrderStatus.SHIPPED,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 'OR9999';
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        RepositoryError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be shipped (not in PROCESSING status)', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute(pendingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        pendingOrder.id,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute(pendingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockOrderRepository.mockSuccessfulFind(confirmedOrder);

      const result = await useCase.execute(confirmedOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already shipped', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();

      mockOrderRepository.mockSuccessfulFind(shippedOrder);

      const result = await useCase.execute(shippedOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockOrderRepository.mockSuccessfulFind(deliveredOrder);

      const result = await useCase.execute(deliveredOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockOrderRepository.mockSuccessfulFind(cancelledOrder);

      const result = await useCase.execute(cancelledOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if updateStatus fails', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();

      mockOrderRepository.mockSuccessfulFind(processingOrder);
      mockOrderRepository.mockUpdateStatusFailure('Database error');

      const result = await useCase.execute(processingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        processingOrder.id,
        OrderStatus.SHIPPED,
      );
    });

    it('should return Failure if repository throws unexpected error', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();
      const unexpectedError = new Error('Network connection failed');

      mockOrderRepository.findById.mockRejectedValue(unexpectedError);

      const result = await useCase.execute(processingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Usecase Error',
        UseCaseError,
        unexpectedError,
      );
    });

    it('should ship order with COD payment method', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.PROCESSING,
      });

      mockOrderRepository.mockSuccessfulFind(codOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(codOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
      expect(result.value.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
    });

    it('should ship order with online payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PROCESSING,
        paymentId: 'PAY_STRIPE_001', // Payment already completed
      });

      mockOrderRepository.mockSuccessfulFind(stripeOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(stripeOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should ship multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const processingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PROCESSING,
        paymentId: 'PAY001',
      };

      mockOrderRepository.mockSuccessfulFind(processingMultiItem);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(processingMultiItem.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(5);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should return RepositoryError when findById fails', async () => {
      const orderId = 'OR0001';
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        RepositoryError,
      );
    });

    it('should return RepositoryError when updateStatus fails', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();

      mockOrderRepository.mockSuccessfulFind(processingOrder);
      mockOrderRepository.mockUpdateStatusFailure('Database connection lost');

      const result = await useCase.execute(processingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection lost',
        RepositoryError,
      );
    });
  });
});
