// src/modules/orders/presentation/controllers/get-order.controller.spec.ts
import { GetOrderController } from './get-order.controller';
import { GetOrderUseCase } from '../../../application/usecases/GetOrder/get-order.usecase';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { IOrder } from '../../../domain/interfaces/IOrder';

describe('GetOrderController', () => {
  let controller: GetOrderController;
  let mockGetOrderUseCase: jest.Mocked<GetOrderUseCase>;
  let mockOrder: IOrder;
  let orderId: string;
  beforeEach(() => {
    // Mock the GetOrderUseCase
    mockGetOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetOrderUseCase>;

    orderId = 'OR0000001';
    mockOrder = {
      id: orderId,
      customerId: 'CU0000001',
      items: [
        {
          id: 'item_1',
          productId: 'PR0000001',
          productName: 'Test Product',
          unitPrice: 100,
          quantity: 2,
          lineTotal: 200,
        },
        {
          id: 'item_2',
          productId: 'PR0000002',
          productName: 'Another Product',
          unitPrice: 50,
          quantity: 1,
          lineTotal: 50,
        },
      ],
      status: OrderStatus.PENDING,
      totalPrice: 250,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    } as IOrder;

    controller = new GetOrderController(mockGetOrderUseCase);
  });

  describe('handle', () => {
    it('should return success if order if found', async () => {
      mockGetOrderUseCase.execute.mockResolvedValue(Result.success(mockOrder));

      const result = await controller.handle(orderId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
      }
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockGetOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if order is not found', async () => {
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
