// src/modules/orders/application/usecases/GetOrder/get-order.usecase.spec.ts

import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { GetOrderUseCase } from './getOrder.usecase';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    // Create a mocked OrderRepository
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
    it('should return the order if found', async () => {
      const orderId = 1;
      const expectedOrder = new Order({ id: orderId, totalPrice: 500 });

      mockOrderRepository.findById.mockResolvedValue(expectedOrder);

      const result = await useCase.execute(orderId);

      expect(result).toBe(expectedOrder);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if order is not found', async () => {
      const orderId = 999;
      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(orderId)).rejects.toThrow(
        `Order with id ${orderId} not found`,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should rethrow errors from the repository', async () => {
      const orderId = 2;
      const repoError = new Error('Database connection failed');

      mockOrderRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(orderId)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });
  });
});
