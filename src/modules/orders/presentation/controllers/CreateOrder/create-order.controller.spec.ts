// src/modules/Orders/presentation/controllers/Create-Order.controller.spec.ts
import { CreateOrderController } from './create-order.controller';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { CreateOrderUseCase } from '../../../application/usecases/CreateOrder/create-order.usecase';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('CreateOrderController', () => {
  let controller: CreateOrderController;
  let mockCreateOrderUseCase: jest.Mocked<CreateOrderUseCase>;
  let mockOrder: IOrder;
  let mockCreateOrderDto: CreateOrderDto;

  beforeEach(() => {
    // Mock the CreateOrderUseCase
    mockCreateOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateOrderUseCase>;

    controller = new CreateOrderController(mockCreateOrderUseCase);

    mockOrder = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      customerId: 'customer-123',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 10.5,
          lineTotal: 21.0,
        },
      ],
      status: OrderStatus.PENDING,
      totalPrice: 21.0,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    } as IOrder;

    mockCreateOrderDto = {
      customerId: 'customer-123',
      items: [
        {
          productId: 'product-1',
          quantity: 2,
        },
      ],
      status: OrderStatus.PENDING,
    } as CreateOrderDto;
  });
  describe('handle', () => {
    it('should return success if Order if created', async () => {
      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(mockCreateOrderDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
      }
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        mockCreateOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if Order is not created', async () => {
      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.failure(ErrorFactory.UseCaseError(`Failed to save Order`).error),
      );

      const result = await controller.handle(mockCreateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Controller failed to create Order');
        expect(result.error.cause?.message).toBe(`Failed to save Order`);
      }

      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        mockCreateOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const error = new Error('Database connection failed');

      mockCreateOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(mockCreateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        mockCreateOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
