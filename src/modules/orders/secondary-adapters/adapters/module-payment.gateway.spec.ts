import { Test, TestingModule } from '@nestjs/testing';
import { ModulePaymentGateway } from './module-payment.gateway';
import { CreatePaymentUseCase } from '../../../payments/core/application/usecases/create-payment/create-payment.usecase';
import { CreatePaymentIntentUseCase } from '../../../payments/core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { ProcessRefundUseCase } from '../../../payments/core/application/usecases/process-refund/process-refund.usecase';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../testing';
import { IPayment } from '../../../payments/core/domain/interfaces/payment.interface';
import { PaymentStatusType } from '../../../payments/core/domain/value-objects/payment-status';

describe('ModulePaymentGateway createPayment', () => {
  let gateway: ModulePaymentGateway;
  let createPaymentExecute: jest.MockedFunction<
    CreatePaymentUseCase['execute']
  >;

  const input = {
    orderId: 123,
    amount: 2550,
    currency: 'EUR',
    paymentMethod: PaymentMethodType.STRIPE,
    userId: 2,
  };

  const payment: IPayment = {
    id: 5,
    orderId: 123,
    userId: 2,
    amount: 2550,
    currency: 'EUR',
    paymentMethod: PaymentMethodType.STRIPE,
    status: PaymentStatusType.AUTHORIZED,
    transactionId: 'txn_123',
    gatewayPaymentIntentId: null,
    gatewayClientSecret: 'secret',
    paymentMethodInfo: null,
    refundedAmount: 0,
    refunds: [],
    failureReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    createPaymentExecute = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulePaymentGateway,
        {
          provide: CreatePaymentUseCase,
          useValue: { execute: createPaymentExecute },
        },
        {
          provide: CreatePaymentIntentUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ProcessRefundUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    gateway = module.get(ModulePaymentGateway);
  });

  it('authorizes as the system caller and omits the client secret', async () => {
    createPaymentExecute.mockResolvedValue(Result.success(payment));

    const result = await gateway.createPayment(input);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(createPaymentExecute).toHaveBeenCalledWith({
      ...input,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    expect(result.value).toEqual({
      id: 5,
      orderId: 123,
      userId: 2,
      amount: 2550,
      currency: 'EUR',
      paymentMethod: PaymentMethodType.STRIPE,
      status: 'AUTHORIZED',
      transactionId: 'txn_123',
      gatewayPaymentIntentId: null,
      paymentMethodInfo: null,
      refundedAmount: 0,
      failureReason: null,
      createdAt: payment.createdAt,
      completedAt: null,
      updatedAt: payment.updatedAt,
    });
  });

  it('returns the payment failure unchanged', async () => {
    const failure = ErrorFactory.UseCaseError('Payment authorization failed');
    createPaymentExecute.mockResolvedValue(failure);

    const result = await gateway.createPayment(input);

    expect(result).toBe(failure);
  });

  it('fails when the saved payment has no id', async () => {
    createPaymentExecute.mockResolvedValue(
      Result.success({ ...payment, id: null }),
    );

    const result = await gateway.createPayment(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment was saved without an id',
    );
  });
});
