// src/modules/orders/application/usecases/ship-order/ship-order.usecase.spec.ts
import { ShipOrderUseCase } from './ship-order.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

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

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(processingOrder);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute(processingOrder.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
      expect(result.value.id).toBe(processingOrder.id);

      expect(mockOrderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        processingOrder.id!,
      );
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 999;
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        RepositoryError,
      );
      expect(mockOrderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be shipped (not in PROCESSING status)', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(pendingOrder);

      const result = await useCase.execute(pendingOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        pendingOrder.id!,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(pendingOrder);

      const result = await useCase.execute(pendingOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(confirmedOrder);

      const result = await useCase.execute(confirmedOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already shipped', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(shippedOrder);

      const result = await useCase.execute(shippedOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(deliveredOrder);

      const result = await useCase.execute(deliveredOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

      const result = await useCase.execute(cancelledOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order must be in processing state to ship',
        DomainError,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if save fails', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(processingOrder);
      mockOrderRepository.mockSaveFailure('Database error');

      const result = await useCase.execute(processingOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should ship order with online payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PROCESSING,
        paymentId: 1, // Payment already completed
      });

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(stripeOrder);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute(stripeOrder.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should ship multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const processingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PROCESSING,
        paymentId: 1,
      };

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(processingMultiItem);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute(processingMultiItem.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(5);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should return RepositoryError when findByIdForUpdate fails', async () => {
      const orderId = 1;
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        RepositoryError,
      );
    });

    it('should return RepositoryError when save fails', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(processingOrder);
      mockOrderRepository.mockSaveFailure('Database connection lost');

      const result = await useCase.execute(processingOrder.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection lost',
        RepositoryError,
      );
    });
  });
});
