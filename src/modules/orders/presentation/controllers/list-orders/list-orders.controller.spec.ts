// src/modules/orders/presentation/controllers/ListOrders/list-orders.controller.spec.ts
import { ListOrdersController } from './list-orders.controller';
import { ListOrdersUsecase } from '../../../application/usecases/list-orders/list-orders.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import {
  Result,
  isSuccess,
  isFailure,
} from '../../../../../core/domain/result';
import { ListOrdersQueryDto } from '../../dto/list-orders-query.dto';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('ListOrdersController', () => {
  let controller: ListOrdersController;
  let mockUsecase: jest.Mocked<ListOrdersUsecase>;

  beforeEach(() => {
    mockUsecase = {
      execute: jest.fn(),
    } as any;

    controller = new ListOrdersController(mockUsecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns success when usecase returns success', async () => {
    const dto: ListOrdersQueryDto = {};
    const sampleOrder = OrderTestFactory.createMockOrder();

    mockUsecase.execute.mockResolvedValue(Result.success([sampleOrder]));

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toEqual([sampleOrder]);
      expect(res.value).toHaveLength(1);
    }
  });

  it('returns success with multiple orders', async () => {
    const dto: ListOrdersQueryDto = {};
    const orders = [
      OrderTestFactory.createPendingOrder({ id: 'OR0001' }),
      OrderTestFactory.createShippedOrder({ id: 'OR0002' }),
      OrderTestFactory.createCancelledOrder({ id: 'OR0003' }),
    ];

    mockUsecase.execute.mockResolvedValue(Result.success(orders));

    const res = await controller.handle(dto);

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toHaveLength(3);
      expect(res.value[0].status).toBe(OrderStatus.PENDING);
      expect(res.value[1].status).toBe(OrderStatus.SHIPPED);
      expect(res.value[2].status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('returns success with empty list', async () => {
    const dto: ListOrdersQueryDto = {};

    mockUsecase.execute.mockResolvedValue(Result.success([]));

    const res = await controller.handle(dto);

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toEqual([]);
      expect(res.value).toHaveLength(0);
    }
  });

  it('returns ControllerError when usecase returns failure', async () => {
    const dto: ListOrdersQueryDto = {};
    const usecaseErr = new Error('usecase failed');

    mockUsecase.execute.mockResolvedValue(Result.failure(usecaseErr as any));

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error).toBeInstanceOf(ControllerError);
      expect(res.error.message).toContain('Controller failed to get order');
    }
  });

  it('returns ControllerError when controller catches unexpected exception', async () => {
    const dto: ListOrdersQueryDto = {};
    const thrown = new Error('boom');

    mockUsecase.execute.mockRejectedValue(thrown);

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error).toBeInstanceOf(ControllerError);
      expect(res.error.message).toContain('Unexpected controller error');
      expect(res.error.cause).toBe(thrown);
    }
  });

  describe('with query parameters', () => {
    it('should pass status filter to usecase', async () => {
      const dto: ListOrdersQueryDto = { status: OrderStatus.PENDING };
      const orders = [OrderTestFactory.createPendingOrder()];

      mockUsecase.execute.mockResolvedValue(Result.success(orders));

      const res = await controller.handle(dto);

      expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
      expect(isSuccess(res)).toBe(true);
    });

    it('should pass pagination parameters to usecase', async () => {
      const dto: ListOrdersQueryDto = { page: 1, limit: 10 };
      const orders = Array.from({ length: 10 }, (_, i) =>
        OrderTestFactory.createMockOrder({ id: `OR${i}` }),
      );

      mockUsecase.execute.mockResolvedValue(Result.success(orders));

      const res = await controller.handle(dto);

      expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
      expect(isSuccess(res)).toBe(true);
      if (isSuccess(res)) {
        expect(res.value).toHaveLength(10);
      }
    });

    it('should handle customer filter', async () => {
      const dto: ListOrdersQueryDto = { customerId: 'CUST1' };
      const orders = [
        OrderTestFactory.createMockOrder({ customerId: 'CUST1' }),
      ];

      mockUsecase.execute.mockResolvedValue(Result.success(orders));

      const res = await controller.handle(dto);

      expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
      expect(isSuccess(res)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle orders with multiple items', async () => {
      const dto: ListOrdersQueryDto = {};
      const orders = [
        OrderTestFactory.createMultiItemOrder(3),
        OrderTestFactory.createMultiItemOrder(5),
      ];

      mockUsecase.execute.mockResolvedValue(Result.success(orders));

      const res = await controller.handle(dto);

      expect(isSuccess(res)).toBe(true);
      if (isSuccess(res)) {
        expect(res.value[0].items.length).toBeGreaterThan(1);
        expect(res.value[1].items.length).toBeGreaterThan(1);
      }
    });
  });
});
