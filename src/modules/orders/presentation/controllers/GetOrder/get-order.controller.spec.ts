// src/modules/orders/presentation/controllers/get-order.controller.spec.ts
import { GetOrderController } from './get-order.controller';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrder/getOrder.usecase';
import { Order } from '../../../domain/entities/order';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';

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
    it('should return success if order if found', async () => {
      const orderId = 1;
      const expectedOrder = new Order({ id: orderId, totalPrice: 500 });

      mockGetOrderUseCase.execute.mockResolvedValue(
        Result.success(expectedOrder),
      );

      const result = await controller.handle(orderId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(expectedOrder);
      }
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if order is not found', async () => {
      const orderId = 999;

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
      const orderId = 999;
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
