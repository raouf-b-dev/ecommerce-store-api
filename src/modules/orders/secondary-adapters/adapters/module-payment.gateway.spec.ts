import { Test, TestingModule } from '@nestjs/testing';
import { ModulePaymentGateway } from './module-payment.gateway';
import { CreatePaymentUseCase } from '../../../payments/core/application/usecases/create-payment/create-payment.usecase';
import { CreatePaymentIntentUseCase } from '../../../payments/core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { ProcessRefundUseCase } from '../../../payments/core/application/usecases/process-refund/process-refund.usecase';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../shared-kernel/domain/exceptions/status-code';
import { ResultAssertionHelper } from '../../../../testing';
import { IPayment } from '../../../payments/core/domain/interfaces/payment.interface';
import { PaymentStatusType } from '../../../payments/core/domain/value-objects/payment-status';
import { PaymentTestFactory } from '../../../payments/testing';

describe('ModulePaymentGateway', () => {
  let gateway: ModulePaymentGateway;
  let createPaymentExecute: jest.MockedFunction<
    CreatePaymentUseCase['execute']
  >;
  let createPaymentIntentExecute: jest.MockedFunction<
    CreatePaymentIntentUseCase['execute']
  >;
  let processRefundExecute: jest.MockedFunction<
    ProcessRefundUseCase['execute']
  >;

  const input = {
    orderId: 123,
    amount: 2550,
    currency: 'EUR',
    paymentMethod: PaymentMethodType.CARD,
    userId: 2,
  };

  const payment: IPayment = PaymentTestFactory.createMockPayment({
    id: 5,
    orderId: 123,
    userId: 2,
    amount: 2550,
    currency: 'EUR',
    paymentMethod: PaymentMethodType.CARD,
    status: PaymentStatusType.AUTHORIZED,
    transactionId: 'txn_123',
    gatewayClientSecret: 'secret',
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    createPaymentExecute = jest.fn();
    createPaymentIntentExecute = jest.fn();
    processRefundExecute = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulePaymentGateway,
        {
          provide: CreatePaymentUseCase,
          useValue: { execute: createPaymentExecute },
        },
        {
          provide: CreatePaymentIntentUseCase,
          useValue: { execute: createPaymentIntentExecute },
        },
        {
          provide: ProcessRefundUseCase,
          useValue: { execute: processRefundExecute },
        },
      ],
    }).compile();

    gateway = module.get(ModulePaymentGateway);
  });

  describe('createPayment', () => {
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
        paymentMethod: PaymentMethodType.CARD,
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

  describe('createPaymentIntent', () => {
    it('returns the payment intent failure unchanged', async () => {
      const failure = ErrorFactory.RepositoryError(
        'Pending payment already exists for order',
        { status: StatusCode.CONFLICT, retryable: true },
      );
      createPaymentIntentExecute.mockResolvedValue(failure);

      const result = await gateway.createPaymentIntent({
        orderId: 1,
        amount: 2550,
        currency: 'USD',
        paymentMethod: PaymentMethodType.CARD,
        userId: 10,
      });

      expect(result).toBe(failure);
    });

    it('returns paymentId and clientSecret on success', async () => {
      createPaymentIntentExecute.mockResolvedValue(
        Result.success({
          paymentId: 42,
          clientSecret: 'secret_123',
        }),
      );

      const result = await gateway.createPaymentIntent({
        orderId: 1,
        amount: 2550,
        currency: 'USD',
        paymentMethod: PaymentMethodType.CARD,
        userId: 10,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        paymentId: 42,
        clientSecret: 'secret_123',
      });
    });
  });

  describe('processRefund', () => {
    it('forwards an explicit amount to ProcessRefundUseCase', async () => {
      processRefundExecute.mockResolvedValue(Result.success(payment));

      const result = await gateway.processRefund({
        paymentId: 5,
        amount: 25.5,
        reason: 'Order cancelled',
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(processRefundExecute).toHaveBeenCalledWith({
        paymentId: 5,
        amount: 25.5,
        reason: 'Order cancelled',
      });
    });

    it('forwards remaining mode to ProcessRefundUseCase', async () => {
      processRefundExecute.mockResolvedValue(Result.success(payment));

      const result = await gateway.processRefund({
        paymentId: 5,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(processRefundExecute).toHaveBeenCalledWith({
        paymentId: 5,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });
    });

    it('preserves retryable true when ProcessRefundUseCase fails retryably', async () => {
      processRefundExecute.mockResolvedValue(
        ErrorFactory.UseCaseError('Provider timeout', { retryable: true }),
      );

      const result = await gateway.processRefund({
        paymentId: 5,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to process refund',
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { retryable: true },
      });
    });

    it('preserves retryable false when ProcessRefundUseCase fails non-retryably', async () => {
      processRefundExecute.mockResolvedValue(
        ErrorFactory.UseCaseError(
          'Payment cannot be refunded in current status',
          {
            retryable: false,
          },
        ),
      );

      const result = await gateway.processRefund({
        paymentId: 5,
        amount: 10,
        reason: 'Order cancelled',
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to process refund',
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { retryable: false },
      });
    });
  });
});
