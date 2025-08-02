// src/modules/orders/application/usecases/GetOrder/get-order.usecase.spec.ts
import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import {
  Result,
  isFailure,
  isSuccess,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { GetOrderUseCase } from './getOrder.usecase';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new GetOrderUseCase(mockOrderRepository);
  });

  describe('execute', () => {
    it('should return Success if order is found', async () => {
      const orderId = 1;
      const expectedOrder = new Order({ id: orderId, totalPrice: 500 });

      mockOrderRepository.findById.mockResolvedValue(
        Result.success(expectedOrder),
      );

      const result = await useCase.execute(orderId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(expectedOrder);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order is not found', async () => {
      const orderId = 999;
      mockOrderRepository.findById.mockResolvedValue(
        ErrorFactory.RepositoryError(`Order with id ${orderId} not found`),
      );

      const result = await useCase.execute(orderId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Order with id ${orderId} not found`);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const orderId = 2;
      const repoError = new Error('Database connection failed');

      mockOrderRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute(orderId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });
  });
});
