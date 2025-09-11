// src/modules/Orders/application/usecases/CreateOrder/create-order.usecase.spec.ts
import { OrderRepository } from '../../../domain/repositories/order-repository';
import {
  Result,
  isFailure,
  isSuccess,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CreateOrderUseCase } from './create-order.usecase';
import { CreateOrderDto } from '../../../presentation/dto/create-order.dto';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderFactory } from '../../../domain/factories/order.factory';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let orderFactory: OrderFactory;
  let mockOrder: IOrder;
  let mockCreateOrderDto: CreateOrderDto;

  beforeEach(() => {
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      ListOrders: jest.fn(),
    };
    orderFactory = new OrderFactory();

    useCase = new CreateOrderUseCase(orderFactory, mockOrderRepository);

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

  describe('execute', () => {
    it('should return Success if order is created', async () => {
      mockOrderRepository.save.mockResolvedValue(Result.success(mockOrder));

      const result = await useCase.execute(mockCreateOrderDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
      }

      // Factory will aggregate and add totalPrice; assert repository called with aggregated DTO
      const aggregatedDto = orderFactory.createFromDto(mockCreateOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order is not created', async () => {
      const repoError = ErrorFactory.RepositoryError(`Failed to save Order`);
      mockOrderRepository.save.mockResolvedValue(repoError);

      const result = await useCase.execute(mockCreateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Failed to save Order`);
      }

      const aggregatedDto = orderFactory.createFromDto(mockCreateOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const repoError = new Error('Database connection failed');

      mockOrderRepository.save.mockRejectedValue(repoError);

      const result = await useCase.execute(mockCreateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }

      const aggregatedDto = orderFactory.createFromDto(mockCreateOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
