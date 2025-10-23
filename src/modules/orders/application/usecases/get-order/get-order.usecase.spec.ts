// src/modules/orders/application/usecases/get-order/get-order.usecase.spec.ts
import { GetOrderUseCase } from './get-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { OrderBuilder } from '../../../testing/builders/order.builder';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new GetOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with order when order is found', async () => {
      const orderId = 'OR0000001';
      const orderPrimitives = OrderTestFactory.createMockOrder({ id: orderId });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.status).toBe(OrderStatus.PENDING);
      expect(result.value.items).toBeDefined();

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure with UseCaseError when order is not found', async () => {
      const orderId = 'OR0000001';
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
      const orderId = 'OR0000001';
      const repoError = new Error('Database connection failed');

      mockOrderRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle empty order ID gracefully', async () => {
      const emptyId = '';
      mockOrderRepository.mockOrderNotFound(emptyId);

      const result = await useCase.execute(emptyId);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${emptyId} not found`,
        UseCaseError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(emptyId);
    });

    it('should handle null/undefined order ID', async () => {
      const nullId = null as any;
      mockOrderRepository.mockOrderNotFound(nullId);

      const result = await useCase.execute(nullId);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        UseCaseError,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(nullId);
    });

    it('should return order with correct properties', async () => {
      const orderId = 'OR0000001';
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 'CU0000001',
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.customerId).toBe('CU0000001');
      expect(result.value.items).toHaveLength(1);
    });

    it('should return order data correctly for multiple items', async () => {
      const orderId = 'OR0000001';
      const orderPrimitives = OrderTestFactory.createMultiItemOrder(2);
      orderPrimitives.id = orderId;

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(2);
      expect(result.value.id).toBe(orderId);
    });
  });

  describe('edge cases', () => {
    it('should handle repository returning different error types', async () => {
      const orderId = 'OR0000001';
      const customError = new Error('Custom repository error');
      customError.name = 'CustomRepositoryError';

      mockOrderRepository.findById.mockRejectedValue(customError);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        customError,
      );
    });

    it('should handle very long order IDs', async () => {
      const longId = 'OR' + '0'.repeat(1000);
      mockOrderRepository.mockOrderNotFound(longId);

      const result = await useCase.execute(longId);

      ResultAssertionHelper.assertResultFailure(result);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(longId);
    });

    it('should retrieve pending order successfully', async () => {
      const orderId = 'OR0000001';
      const pendingOrder = OrderTestFactory.createPendingOrder({ id: orderId });

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.PENDING);
    });

    it('should retrieve shipped order successfully', async () => {
      const orderId = 'OR0000001';
      const shippedOrder = OrderTestFactory.createShippedOrder({ id: orderId });

      mockOrderRepository.mockSuccessfulFind(shippedOrder);

      const result = await useCase.execute(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('complex scenarios with builder', () => {
    it('should retrieve order with custom configuration', async () => {
      const orderPrimitives = new OrderBuilder()
        .withId('OR0000001')
        .withCustomerId('CUST999')
        .withItems(5)
        .withStatus(OrderStatus.PENDING)
        .build();

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute(orderPrimitives.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe('OR0000001');
      expect(result.value.customerId).toBe('CUST999');
      expect(result.value.items).toHaveLength(5);
    });
  });
});
