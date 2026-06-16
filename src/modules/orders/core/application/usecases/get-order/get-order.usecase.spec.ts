import { GetOrderUseCase } from './get-order.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { OrderBuilder } from '../../../../testing/builders/order.builder';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import {
  CallerContext,
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  const adminContext: CallerContext = createUserCallerContext({
    userId: 1,
    customerId: null,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders']),
  });

  const customerContext: CallerContext = createUserCallerContext({
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new GetOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with order when order is found and caller has view_all_orders', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 456,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.status).toBe(OrderStatus.PENDING_PAYMENT);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
    });

    it('should return Success with order when order belongs to the customer', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 123,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.customerId).toBe(123);
    });

    it('should return Failure (404) when order belongs to a different customer', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 456,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
    });

    it('should return Failure (404) when customer role has no customerId bound', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 123,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const brokenCustomerContext = createUserCallerContext({
        userId: 2,
        customerId: null,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      const result = await useCase.execute({
        orderId,
        callerContext: brokenCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
    });

    it('should allow system caller to fetch any order', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 456,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.customerId).toBe(456);
    });

    it('should return Failure with UseCaseError when order is not found', async () => {
      const orderId = 1;
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute({
        orderId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
    });

    it('should handle empty order ID gracefully', async () => {
      const emptyId = 0;
      mockOrderRepository.mockOrderNotFound(emptyId);

      const result = await useCase.execute({
        orderId: emptyId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${emptyId} not found`,
        UseCaseError,
      );
    });

    it('should return order with correct properties', async () => {
      const orderId = 1;
      const orderPrimitives = OrderTestFactory.createMockOrder({
        id: orderId,
        customerId: 123,
      });

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.customerId).toBe(123);
    });
  });

  describe('complex scenarios with builder', () => {
    it('should retrieve order with custom configuration', async () => {
      const orderPrimitives = new OrderBuilder()
        .withId(1)
        .withCustomerId(123)
        .withItems(5)
        .withStatus(OrderStatus.PENDING_PAYMENT)
        .build();

      mockOrderRepository.mockSuccessfulFind(orderPrimitives);

      const result = await useCase.execute({
        orderId: orderPrimitives.id!,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(result.value.customerId).toBe(123);
      expect(result.value.items).toHaveLength(5);
    });
  });
});
