// src/modules/orders/application/usecases/ListOrders/list-orders.usecase.spec.ts
import { ListOrdersUsecase } from './list-orders.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';
import { ListOrdersQueryDto } from '../../../../primary-adapters/dto/list-orders-query.dto';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Order } from '../../../domain/entities/order';

describe('ListOrdersUsecase', () => {
  let usecase: ListOrdersUsecase;
  let mockRepository: MockOrderRepository;

  beforeEach(() => {
    mockRepository = new MockOrderRepository();
    usecase = new ListOrdersUsecase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('returns success with list of orders when repository returns success', async () => {
    const dto: ListOrdersQueryDto = {};
    const sampleOrder = Order.fromPrimitives(
      OrderTestFactory.createMockOrder(),
    );

    mockRepository.mockSuccessfulList([sampleOrder]);

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([sampleOrder]);
    expect(result.value).toHaveLength(1);
  });

  it('returns success with multiple orders', async () => {
    const dto: ListOrdersQueryDto = {};
    const orders = [
      OrderTestFactory.createPendingPaymentOrder({ id: 1 }),
      OrderTestFactory.createShippedOrder({ id: 2 }),
      OrderTestFactory.createCancelledOrder({ id: 3 }),
    ];

    mockRepository.mockSuccessfulList(orders);

    const result = await usecase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(3);
    expect(result.value[0].id).toBe(1);
    expect(result.value[1].id).toBe(2);
    expect(result.value[2].id).toBe(3);
  });

  it('returns success with empty list when no orders exist', async () => {
    const dto: ListOrdersQueryDto = {};

    mockRepository.mockSuccessfulList([]);

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([]);
    expect(result.value).toHaveLength(0);
  });

  it('propagates repository failure as usecase failure', async () => {
    const dto: ListOrdersQueryDto = {};
    const repoErr = new RepositoryError('repo failed');

    mockRepository.listOrders.mockResolvedValue(Result.failure(repoErr));

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(repoErr);
      expect(result.error.message).toBe('repo failed');
    }
  });

  it('returns UseCaseError when repository throws an unexpected error', async () => {
    const dto: ListOrdersQueryDto = {};
    const thrown = new Error('boom');

    mockRepository.listOrders.mockRejectedValue(thrown);

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(UseCaseError);
      expect(result.error.message).toContain('Unexpected Error Occured');
      expect(result.error.cause).toBe(thrown);
    }
  });

  describe('filtering and querying', () => {
    it('should pass query parameters to repository', async () => {
      const dto: ListOrdersQueryDto = {
        status: OrderStatus.PENDING_PAYMENT,
        customerId: 1,
      };
      const orders = [OrderTestFactory.createPendingPaymentOrder()];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should handle pagination parameters', async () => {
      const dto: ListOrdersQueryDto = {
        page: 1,
        limit: 10,
      };
      const orders = Array.from({ length: 10 }, (_, i) =>
        OrderTestFactory.createMockOrder({ id: i }),
      );

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(10);
    });
  });

  describe('edge cases', () => {
    it('should handle repository returning orders with different statuses', async () => {
      const dto: ListOrdersQueryDto = {};
      const orders = [
        OrderTestFactory.createPendingPaymentOrder(),
        OrderTestFactory.createShippedOrder(),
        OrderTestFactory.createCancelledOrder(),
      ];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
      expect(result.value.map((o) => o.status)).toContain('pending_payment');
      expect(result.value.map((o) => o.status)).toContain('shipped');
      expect(result.value.map((o) => o.status)).toContain('cancelled');
    });

    it('should handle multi-item orders in list', async () => {
      const dto: ListOrdersQueryDto = {};
      const orders = [
        OrderTestFactory.createMultiItemOrder(3),
        OrderTestFactory.createMultiItemOrder(5),
      ];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].items.length).toBeGreaterThan(1);
      expect(result.value[1].items.length).toBeGreaterThan(1);
    });
  });
});
