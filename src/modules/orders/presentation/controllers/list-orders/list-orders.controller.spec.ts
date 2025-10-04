// src/modules/orders/presentation/controllers/ListOrders/list-orders.controller.spec.ts
import { ListOrdersController } from './list-orders.controller';
import { ListOrdersUsecase } from '../../../application/usecases/list-orders/list-orders.usecase';
import {
  Result,
  isSuccess,
  isFailure,
} from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { ListOrdersQueryDto } from '../../dto/list-orders-query.dto';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('ListOrdersController', () => {
  let controller: ListOrdersController;
  let mockUsecase: jest.Mocked<ListOrdersUsecase>;

  const sampleOrder: IOrder = {
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
  beforeEach(() => {
    mockUsecase = {
      execute: jest.fn(),
    } as any;

    controller = new ListOrdersController(mockUsecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns success when usecase returns success', async () => {
    const dto: ListOrdersQueryDto = {};
    mockUsecase.execute.mockResolvedValue(Result.success([sampleOrder]));

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toEqual([sampleOrder]);
    }
  });

  it('returns ControllerError when usecase returns failure', async () => {
    const dto: ListOrdersQueryDto = {};
    const usecaseErr = new Error('usecase failed');
    mockUsecase.execute.mockResolvedValue(Result.failure(usecaseErr as any));

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error).toBeInstanceOf(ControllerError);
      expect((res.error as any).message).toContain(
        'Controller failed to get order',
      );
    }
  });

  it('returns ControllerError when controller catches unexpected exception', async () => {
    const dto: ListOrdersQueryDto = {};
    const thrown = new Error('boom');
    mockUsecase.execute.mockRejectedValue(thrown);

    const res = await controller.handle(dto);

    expect(mockUsecase.execute).toHaveBeenCalledWith(dto);
    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error).toBeInstanceOf(ControllerError);
      expect((res.error as any).message).toContain(
        'Unexpected controller error',
      );
    }
  });
});
