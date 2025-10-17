// src/modules/orders/application/usecases/ListOrders/list-orders.usecase.spec.ts
import { ListOrdersUsecase } from './list-orders.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { isSuccess, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { Result } from '../../../../../core/domain/result';
import { OrderStatus } from '../../../domain/value-objects/order-status';

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
    const sampleOrder = OrderTestFactory.createMockOrder();

    mockRepository.mockSuccessfulList([sampleOrder]);

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual([sampleOrder]);
      expect(result.value).toHaveLength(1);
    }
  });

  it('returns success with multiple orders', async () => {
    const dto: ListOrdersQueryDto = {};
    const orders = [
      OrderTestFactory.createPendingOrder({ id: 'OR0001' }),
      OrderTestFactory.createShippedOrder({ id: 'OR0002' }),
      OrderTestFactory.createCancelledOrder({ id: 'OR0003' }),
    ];

    mockRepository.mockSuccessfulList(orders);

    const result = await usecase.execute(dto);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0].id).toBe('OR0001');
      expect(result.value[1].id).toBe('OR0002');
      expect(result.value[2].id).toBe('OR0003');
    }
  });

  it('returns success with empty list when no orders exist', async () => {
    const dto: ListOrdersQueryDto = {};

    mockRepository.mockSuccessfulList([]);

    const result = await usecase.execute(dto);

    expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual([]);
      expect(result.value).toHaveLength(0);
    }
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
        status: OrderStatus.PENDING,
        customerId: 'CUST1',
      };
      const orders = [OrderTestFactory.createPendingOrder()];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
      expect(isSuccess(result)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const dto: ListOrdersQueryDto = {
        page: 1,
        limit: 10,
      };
      const orders = Array.from({ length: 10 }, (_, i) =>
        OrderTestFactory.createMockOrder({ id: `OR000${i}` }),
      );

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(mockRepository.listOrders).toHaveBeenCalledWith(dto);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(10);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle repository returning orders with different statuses', async () => {
      const dto: ListOrdersQueryDto = {};
      const orders = [
        OrderTestFactory.createPendingOrder(),
        OrderTestFactory.createShippedOrder(),
        OrderTestFactory.createCancelledOrder(),
      ];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(3);
        expect(result.value.map((o) => o.status)).toContain('pending');
        expect(result.value.map((o) => o.status)).toContain('shipped');
        expect(result.value.map((o) => o.status)).toContain('cancelled');
      }
    });

    it('should handle multi-item orders in list', async () => {
      const dto: ListOrdersQueryDto = {};
      const orders = [
        OrderTestFactory.createMultiItemOrder(3),
        OrderTestFactory.createMultiItemOrder(5),
      ];

      mockRepository.mockSuccessfulList(orders);

      const result = await usecase.execute(dto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].items.length).toBeGreaterThan(1);
        expect(result.value[1].items.length).toBeGreaterThan(1);
      }
    });
  });
});
