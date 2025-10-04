// src/modules/Orders/presentation/controllers/Create-Order.controller.spec.ts
import { CreateOrderController } from './create-order.controller';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { CreateOrderUseCase } from '../../../application/usecases/create-order/create-order.usecase';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';

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
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),

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
