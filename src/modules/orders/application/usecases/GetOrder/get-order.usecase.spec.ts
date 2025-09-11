// src/modules/orders/application/usecases/GetOrder/get-order.usecase.spec.ts
import { OrderRepository } from '../../../domain/repositories/order-repository';
import {
  Result,
  isFailure,
  isSuccess,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { GetOrderUseCase } from './get-order.usecase';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockOrder: IOrder;
  let orderId: string;

  beforeEach(() => {
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      ListOrders: jest.fn(),
    };

    orderId = 'OR0000001';

    // Create a proper IOrder mock object
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

    useCase = new GetOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return Success with order when order is found', async () => {
      // Arrange
      mockOrderRepository.findById.mockResolvedValue(Result.success(mockOrder));

      // Act
      const result = await useCase.execute(orderId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
        expect(result.value.id).toBe(orderId);
        expect(result.value.customerId).toBe('CU0000001');
        expect(result.value.items).toHaveLength(2);
        expect(result.value.status).toBe(OrderStatus.PENDING);
        expect(result.value.totalPrice).toBe(250);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure with UseCaseError when order is not found', async () => {
      // Arrange
      const repositoryError = ErrorFactory.RepositoryError(
        `Order with id ${orderId} not found`,
      );
      mockOrderRepository.findById.mockResolvedValue(repositoryError);

      // Act
      const result = await useCase.execute(orderId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Order with id ${orderId} not found`);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
      // Arrange
      const repoError = new Error('Database connection failed');
      mockOrderRepository.findById.mockRejectedValue(repoError);

      // Act
      const result = await useCase.execute(orderId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle empty order ID gracefully', async () => {
      // Arrange
      const emptyId = '';
      const repositoryError = ErrorFactory.RepositoryError(
        `Order with id ${emptyId} not found`,
      );
      mockOrderRepository.findById.mockResolvedValue(repositoryError);

      // Act
      const result = await useCase.execute(emptyId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Order with id ${emptyId} not found`);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(emptyId);
    });

    it('should handle null/undefined order ID', async () => {
      // Arrange
      const nullId = null as any;
      const repositoryError = ErrorFactory.RepositoryError(
        `Order with id ${nullId} not found`,
      );
      mockOrderRepository.findById.mockResolvedValue(repositoryError);

      // Act
      const result = await useCase.execute(nullId);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Order with id ${nullId} not found`);
      }
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(nullId);
    });

    it('should return order with correct properties', async () => {
      // Arrange
      const orderWithSpecificData: IOrder = {
        id: orderId,
        customerId: 'CU0000001',
        items: [
          {
            id: 'item_1',
            productId: 'PR0000001',
            productName: 'Expensive Item',
            unitPrice: 999.99,
            quantity: 1,
            lineTotal: 999.99,
          },
        ],
        status: OrderStatus.PAID,
        totalPrice: 999.99,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-02T10:00:00Z'),
      };

      mockOrderRepository.findById.mockResolvedValue(
        Result.success(orderWithSpecificData),
      );

      // Act
      const result = await useCase.execute(orderId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const order = result.value;
        expect(order.id).toBe(orderId);
        expect(order.customerId).toBe('CU0000001');
        expect(order.status).toBe(OrderStatus.PAID);
        expect(order.totalPrice).toBe(999.99);
        expect(order.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));
        expect(order.updatedAt).toEqual(new Date('2025-01-02T10:00:00Z'));
        expect(order.items).toHaveLength(1);
        expect(order.items[0].productId).toBe('PR0000001');
        expect(order.items[0].productName).toBe('Expensive Item');
        expect(order.items[0].unitPrice).toBe(999.99);
        expect(order.items[0].quantity).toBe(1);
      }
    });

    it('should return order data correctly', async () => {
      // Arrange - Create order with multiple items
      const orderWithMultipleItems: IOrder = {
        id: orderId,
        customerId: 'CU0000001',
        items: [
          {
            id: 'item_1',
            productId: 'PR0000001',
            productName: 'Test Product',
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        status: OrderStatus.PENDING,
        totalPrice: 100,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-01T10:00:00Z'),
      };

      mockOrderRepository.findById.mockResolvedValue(
        Result.success(orderWithMultipleItems),
      );

      // Act
      const result = await useCase.execute(orderId);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const order = result.value;

        // Test that we get the correct order data
        expect(order.id).toBe(orderId);
        expect(order.customerId).toBe('CU0000001');
        expect(order.status).toBe(OrderStatus.PENDING);
        expect(order.totalPrice).toBe(100);
        expect(order.items).toHaveLength(1);
        expect(order.items[0].productId).toBe('PR0000001');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle repository returning different error types', async () => {
      // Test with different repository error types
      const customError = new Error('Custom repository error');
      customError.name = 'CustomRepositoryError';

      mockOrderRepository.findById.mockRejectedValue(customError);

      const result = await useCase.execute(orderId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(customError);
      }
    });

    it('should handle very long order IDs', async () => {
      // Arrange
      const longId = 'OR' + '0'.repeat(1000);
      const repositoryError = ErrorFactory.RepositoryError(
        `Order with id ${longId} not found`,
      );
      mockOrderRepository.findById.mockResolvedValue(repositoryError);

      // Act
      const result = await useCase.execute(longId);

      // Assert
      expect(isFailure(result)).toBe(true);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(longId);
    });
  });
});
