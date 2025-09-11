// src/modules/orders/application/usecases/ListOrders/list-orders.usecase.spec.ts
import { ListOrdersUsecase } from './list-orders.usecase';
import {
  Result,
  isSuccess,
  isFailure,
} from '../../../../../core/domain/result';

import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';

describe('ListOrdersUsecase', () => {
  let usecase: ListOrdersUsecase;
  let mockRepo: jest.Mocked<OrderRepository>;

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
    mockRepo = {
      ListOrders: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    } as any;

    usecase = new ListOrdersUsecase(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns success with list of orders when repository returns success', async () => {
    const dto: ListOrdersQueryDto = {};

    mockRepo.ListOrders.mockResolvedValue(Result.success([sampleOrder]));

    const result = await usecase.execute(dto);

    expect(mockRepo.ListOrders).toHaveBeenCalledWith(dto);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual([sampleOrder]);
    }
  });

  it('propagates repository failure as usecase failure', async () => {
    const dto: ListOrdersQueryDto = {};
    const repoErr = new RepositoryError('repo failed');
    mockRepo.ListOrders.mockResolvedValue(Result.failure(repoErr));

    const result = await usecase.execute(dto);

    expect(mockRepo.ListOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(repoErr);
    }
  });

  it('returns UseCaseError when repository throws an unexpected error', async () => {
    const dto: ListOrdersQueryDto = {};
    const thrown = new Error('boom');
    mockRepo.ListOrders.mockRejectedValue(thrown);

    const result = await usecase.execute(dto);

    expect(mockRepo.ListOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(UseCaseError);
      expect((result.error as any).message).toContain(
        'Unexpected Error Occured',
      );
    }
  });
});
