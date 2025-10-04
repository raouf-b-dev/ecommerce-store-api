// src/modules/orders/application/usecases/ListOrders/list-orders.usecase.spec.ts
import { ListOrdersUsecase } from './list-orders.usecase';
import {
  Result,
  isSuccess,
  isFailure,
} from '../../../../../core/domain/result';

import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';

describe('ListOrdersUsecase', () => {
  let usecase: ListOrdersUsecase;
  let mockRepo: jest.Mocked<OrderRepository>;

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
    createdAt: new Date(),
    updatedAt: new Date(),

    // Optional customer notes
    customerNotes: 'Please ring doorbell upon delivery',
  };

  beforeEach(() => {
    mockRepo = {
      listOrders: jest.fn(),
      save: jest.fn(),
      updateItemsInfo: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      cancelById: jest.fn(),
    };

    usecase = new ListOrdersUsecase(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns success with list of orders when repository returns success', async () => {
    const dto: ListOrdersQueryDto = {};

    mockRepo.listOrders.mockResolvedValue(Result.success([sampleOrder]));

    const result = await usecase.execute(dto);

    expect(mockRepo.listOrders).toHaveBeenCalledWith(dto);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual([sampleOrder]);
    }
  });

  it('propagates repository failure as usecase failure', async () => {
    const dto: ListOrdersQueryDto = {};
    const repoErr = new RepositoryError('repo failed');
    mockRepo.listOrders.mockResolvedValue(Result.failure(repoErr));

    const result = await usecase.execute(dto);

    expect(mockRepo.listOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(repoErr);
    }
  });

  it('returns UseCaseError when repository throws an unexpected error', async () => {
    const dto: ListOrdersQueryDto = {};
    const thrown = new Error('boom');
    mockRepo.listOrders.mockRejectedValue(thrown);

    const result = await usecase.execute(dto);

    expect(mockRepo.listOrders).toHaveBeenCalledWith(dto);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(UseCaseError);
      expect((result.error as any).message).toContain(
        'Unexpected Error Occured',
      );
    }
  });
});
