// src/modules/orders/presentation/controllers/get-order.controller.spec.ts
import { GetOrderController } from './get-order.controller';
import { GetOrderUseCase } from '../../../application/usecases/get-order/get-order.usecase';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderTestFactory } from '../../../testing/factories/order.factory';

describe('GetOrderController', () => {
  let controller: GetOrderController;
  let mockGetOrderUseCase: jest.Mocked<GetOrderUseCase>;

  beforeEach(() => {
    mockGetOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetOrderUseCase>;

    controller = new GetOrderController(mockGetOrderUseCase);
  });

  describe('handle', () => {
    it('should return success if order is found', async () => {
      const orderId = 'OR0000001';
      const mockOrder = OrderTestFactory.createMockOrder({ id: orderId });

      mockGetOrderUseCase.execute.mockResolvedValue(Result.success(mockOrder));

      const result = await controller.handle(orderId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
      }
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if order is not found', async () => {
      const orderId = 'OR0000001';

      mockGetOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Order with id ${orderId} not found`).error,
        ),
      );

      const result = await controller.handle(orderId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Controller failed to get order');
        expect(result.error.cause?.message).toBe(
          `Order with id ${orderId} not found`,
        );
      }

      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const orderId = 'OR0000001';
      const error = new Error('Database connection failed');

      mockGetOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(orderId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
