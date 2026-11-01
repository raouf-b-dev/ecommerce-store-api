import { Test } from '@nestjs/testing';
import { UnrecoverableError } from 'bullmq';
import {
  RefundPaymentStep,
  RefundPaymentJobData,
  toRefundJobAmount,
  toProcessRefundInput,
} from './refund-payment.job';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
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
    const jobData: RefundPaymentJobData = {
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
    const jobData: RefundPaymentJobData = {
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
    const jobData: RefundPaymentJobData = {
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

  it('does NOT throw UnrecoverableError when usecase returns retryable gateway failure', async () => {
    execute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Failed to refund checkout payment', {
        cause: new Error('Gateway timeout'),
        retryable: true,
      }),
    );

    const jobData: RefundPaymentJobData = {
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

    const jobData: RefundPaymentJobData = {
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

describe('refund job amount serialization', () => {
  it('round-trips an explicit Money amount to ProcessRefundInput', () => {
    const moneyResult = Money.create(4999, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);
    const serialized = toRefundJobAmount({ amount: moneyResult.value });
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(inputResult);
    expect(inputResult.value).toEqual({
      paymentId: 10,
      reason: 'Order cancelled',
      amount: moneyResult.value,
    });
  });

  it('round-trips remaining mode to ProcessRefundInput', () => {
    const serialized = toRefundJobAmount({ mode: 'remaining' });
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Surplus payment refund',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(inputResult);
    expect(inputResult.value).toEqual({
      paymentId: 10,
      reason: 'Surplus payment refund',
      mode: 'remaining',
    });
  });

  it('returns a non-retryable failure for a legacy major-unit payload', () => {
    const legacyData = {
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amount: 49.99,
    };
    const inputResult = toProcessRefundInput(legacyData);

    ResultAssertionHelper.assertResultFailure(
      inputResult,
      'legacy refund job payload: let the refund-payment queue finish before deploying',
      UseCaseError,
    );
    expect(inputResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });
});
