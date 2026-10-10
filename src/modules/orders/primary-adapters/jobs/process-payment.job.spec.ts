import { Test } from '@nestjs/testing';
import { ProcessPaymentStep } from './process-payment.job';
import { CreateCheckoutPaymentUseCase } from '../../core/application/usecases/create-checkout-payment/create-checkout-payment.usecase';
import { GetOrderUseCase } from '../../core/application/usecases/get-order/get-order.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { MockCorrelationService, createMockJob } from '../../../../testing';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderDetailDTO } from '../../core/application/queries/results/order-detail.result';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';
import { UnrecoverableError } from 'bullmq';
import { ReserveStockResult } from './reserve-stock-job/reserve-stock.job';

describe('ProcessPaymentStep', () => {
  let jobHandler: ProcessPaymentStep;
  let createPaymentExecute: jest.MockedFunction<
    CreateCheckoutPaymentUseCase['execute']
  >;
  let getOrderExecute: jest.MockedFunction<GetOrderUseCase['execute']>;

  const validOrder: OrderDetailDTO = {
    id: 1,
    orderNumber: 'ORD-1',
    userId: 10,
    userName: 'Test User',
    userEmail: 'test@example.com',
    status: 'PENDING_PAYMENT',
    shippingAddress: '1 Market St',
    items: [],
    subtotal: 25.5,
    shippingCost: 0,
    totalAmount: 25.5,
    totalPrice: 25.5,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const jobData: ScheduleCheckoutProps = {
    flowId: 'checkout-flow-1',
    cartId: 100,
    userId: 10,
    orderId: 1,
    paymentMethod: PaymentMethodType.CARD,
    shippingAddress: {
      id: null,
      firstName: 'Test',
      lastName: 'User',
      street: '1 Market St',
      street2: null,
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '5551234567',
      deliveryInstructions: null,
    },
  };

  const validChildResult: ReserveStockResult = {
    reservationId: 42,
    cartId: 100,
    cartItems: [{ productId: 1, quantity: 1, price: 25.5 }],
  };

  beforeEach(async () => {
    createPaymentExecute = jest.fn().mockResolvedValue(
      Result.success({
        paymentId: 99,
        clientSecret: 'secret_123',
      }),
    );
    getOrderExecute = jest.fn().mockResolvedValue(Result.success(validOrder));

    const module = await Test.createTestingModule({
      providers: [
        ProcessPaymentStep,
        {
          provide: CreateCheckoutPaymentUseCase,
          useValue: { execute: createPaymentExecute },
        },
        {
          provide: GetOrderUseCase,
          useValue: { execute: getOrderExecute },
        },
        { provide: CorrelationService, useClass: MockCorrelationService },
      ],
    }).compile();

    jobHandler = module.get(ProcessPaymentStep);
  });

  it('creates the payment intent from the loaded order total', async () => {
    const mockJob = createMockJob('process-payment', jobData);
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({
      'reserve-stock': validChildResult,
    });

    const result = await jobHandler.handle(mockJob);

    expect(result).toEqual({
      ...validChildResult,
      paymentId: 99,
      clientSecret: 'secret_123',
      orderId: 1,
      orderTotal: 2550,
      orderCurrency: 'USD',
    });
    expect(createPaymentExecute).toHaveBeenCalledWith({
      orderId: 1,
      amount: 2550,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 10,
      metadata: {
        orderId: '1',
        reservationId: '42',
        cartId: '100',
      },
    });
  });

  it('throws UnrecoverableError when missing reservation data from child job', async () => {
    const mockJob = createMockJob('process-payment', jobData);
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({});

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
  });

  it('throws UnrecoverableError when getOrderUseCase fails', async () => {
    const mockJob = createMockJob('process-payment', jobData);
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({
      'reserve-stock': validChildResult,
    });
    getOrderExecute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Order not found'),
    );

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
  });

  it('throws when createPaymentUseCase fails', async () => {
    const mockJob = createMockJob('process-payment', jobData);
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({
      'reserve-stock': validChildResult,
    });
    createPaymentExecute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Stripe declined'),
    );

    await expect(jobHandler.handle(mockJob)).rejects.toThrow('Stripe declined');
  });

  it('throws UnrecoverableError when money conversion fails for negative amount', async () => {
    const mockJob = createMockJob('process-payment', jobData);
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({
      'reserve-stock': validChildResult,
    });
    getOrderExecute.mockResolvedValueOnce(
      Result.success({
        ...validOrder,
        totalPrice: -10,
      }),
    );

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
  });
});
