// src/modules/orders/presentation/controllers/get-order.controller.spec.ts
import { GetOrderController } from './get-order.controller';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrder/getOrder.usecase';
import { Order } from '../../../domain/entities/order';

describe('GetOrderController', () => {
  let controller: GetOrderController;
  let mockGetOrderUseCase: jest.Mocked<GetOrderUseCase>;

  beforeEach(() => {
    // Mock the GetOrderUseCase
    mockGetOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetOrderUseCase>;

    controller = new GetOrderController(mockGetOrderUseCase);
  });

  describe('handle', () => {
    it('should return an order if found', async () => {
      const orderId = 1;
      const expectedOrder = new Order({ id: orderId, totalPrice: 500 });

      mockGetOrderUseCase.execute.mockResolvedValue(expectedOrder);

      const result = await controller.handle(orderId);

      expect(result).toBe(expectedOrder);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow errors from the use case', async () => {
      const orderId = 999;
      const error = new Error(`Order with id ${orderId} not found`);

      mockGetOrderUseCase.execute.mockRejectedValue(error);

      await expect(controller.handle(orderId)).rejects.toThrow(
        `Order with id ${orderId} not found`,
      );

      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
