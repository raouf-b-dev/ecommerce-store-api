// src/modules/orders/presentation/controllers/ListOrders/list-orders.controller.spec.ts
import { ListOrdersController } from './list-orders.controller';
import { ListOrdersUsecase } from '../../../application/usecases/ListOrders/list-orders.usecase';
import {
  Result,
  isSuccess,
  isFailure,
} from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { ListOrdersQueryDto } from '../../dto/list-orders-query.dto';
import { ControllerError } from '../../../../../core/errors/controller.error';

describe('ListOrdersController', () => {
  let controller: ListOrdersController;
  let mockUsecase: jest.Mocked<ListOrdersUsecase>;

  const sampleOrder: IOrder = {
    id: 'OR0001',
    customerId: 'CUST1',
    items: [
      {
        id: 'item-1',
        productId: 'PR1',
        productName: 'P1',
        quantity: 1,
        unitPrice: 10,
        lineTotal: 10,
      },
    ],
    status: 'pending' as any,
    totalPrice: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    mockUsecase.execute.mockResolvedValue(Result.success([sampleOrder]));

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toEqual([sampleOrder]);
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
      expect((res.error as any).message).toContain(
        'Controller failed to get order',
      );
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
      expect((res.error as any).message).toContain(
        'Unexpected controller error',
      );
    }
  });
});
