import { Test } from '@nestjs/testing';
import { UnrecoverableError } from 'bullmq';
import { RefundPaymentStep } from './refund-payment.job';
import { RefundPaymentPayload } from '../../core/application/messaging/refund-payment.payload';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';
import {
  MockCorrelationService,
  createMockJob,
  ResultAssertionHelper,
} from '../../../../testing';

describe('RefundPaymentStep', () => {
  let jobHandler: RefundPaymentStep;
  let execute: jest.MockedFunction<RefundCheckoutPaymentUseCase['execute']>;

  beforeEach(async () => {
    execute = jest.fn().mockResolvedValue(Result.success(undefined));

    const module = await Test.createTestingModule({
      providers: [
        RefundPaymentStep,
        {
          provide: RefundCheckoutPaymentUseCase,
          useValue: { execute },
        },
        { provide: CorrelationService, useClass: MockCorrelationService },
      ],
    }).compile();

    jobHandler = module.get(RefundPaymentStep);
  });

  it('refunds payment successfully when valid amount is provided', async () => {
    const moneyResult = Money.create(4999, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);
    const jobData: RefundPaymentPayload = {
      orderId: 1,
      paymentId: 10,
      amountMinor: 4999,
      currency: 'USD',
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: moneyResult.value,
      reason: 'Order cancelled',
    });
  });

  it('passes checkout compensation reason to use case', async () => {
    const moneyResult = Money.create(3550, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);
    const jobData: RefundPaymentPayload = {
      orderId: 1,
      paymentId: 10,
      amountMinor: 3550,
      currency: 'USD',
      reason: 'Checkout compensation',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: moneyResult.value,
      reason: 'Checkout compensation',
    });
  });

  it('forwards remaining mode without an amount', async () => {
    const jobData: RefundPaymentPayload = {
      orderId: 1,
      paymentId: 10,
      mode: 'remaining',
      reason: 'Surplus payment refund',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      mode: 'remaining',
      reason: 'Surplus payment refund',
    });
  });

  it('throws UnrecoverableError for a legacy major-unit payload', async () => {
    const legacyJob = createMockJob('refund-payment', {
      orderId: 1,
      paymentId: 10,
      amount: 49.99,
      reason: 'Order cancelled',
    });

    await expect(jobHandler.handle(legacyJob)).rejects.toThrow(
      UnrecoverableError,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('throws UnrecoverableError when amountMinor is not a valid Money', async () => {
    const jobData = {
      orderId: 1,
      paymentId: 10,
      amountMinor: -1,
      currency: 'USD',
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('does NOT throw UnrecoverableError when usecase returns retryable gateway failure', async () => {
    execute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Failed to refund checkout payment', {
        cause: new Error('Gateway timeout'),
        retryable: true,
      }),
    );

    const jobData: RefundPaymentPayload = {
      orderId: 1,
      paymentId: 10,
      amountMinor: 2500,
      currency: 'USD',
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    const promise = jobHandler.handle(mockJob);
    await expect(promise).rejects.toThrow('Failed to refund checkout payment');
    await expect(promise).rejects.not.toThrow(UnrecoverableError);
  });

  it('throws UnrecoverableError when usecase returns non-retryable failure', async () => {
    execute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Payment cannot be refunded in current status'),
    );

    const jobData: RefundPaymentPayload = {
      orderId: 1,
      paymentId: 10,
      amountMinor: 2500,
      currency: 'USD',
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
  });
});
