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
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';

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
      updateItemsInfo: jest.fn(),
      deleteById: jest.fn(),
      listOrders: jest.fn(),
      cancelById: jest.fn(),
    };
    orderFactory = new OrderFactory();

    useCase = new CreateOrderUseCase(orderFactory, mockOrderRepository);

    mockOrder = {
      // Basic identifiers
      id: 'OR0001',
      customerId: 'CUST1',
      paymentInfoId: 'PAY001',
      shippingAddressId: 'ADDR001',

      // Order items
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

      // Customer information
      customerInfo: {
        customerId: 'CUST1',
        email: 'customer@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      },

      // Payment information
      paymentInfo: {
        id: 'PAY001',
        method: PaymentMethod.CREDIT_CARD,
        amount: 15,
        status: PaymentStatus.PENDING,
        transactionId: 'TXN123456',
        notes: 'Awaiting payment confirmation',
      },

      // Shipping address
      shippingAddress: {
        id: 'ADDR001',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '+1234567890',
      },

      // Pricing
      subtotal: 10,
      shippingCost: 5,
      totalPrice: 15,

      // Order status and timestamps
      status: OrderStatus.PENDING,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),

      // Optional customer notes
      customerNotes: 'Please ring doorbell upon delivery',
    };

    mockCreateOrderDto = {
      customerInfo: {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
      items: [
        {
          productId: 'PR3',
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      },
      paymentInfo: {
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
    };
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
