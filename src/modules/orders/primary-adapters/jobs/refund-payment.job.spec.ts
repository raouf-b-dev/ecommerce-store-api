import { Test } from '@nestjs/testing';
import { UnrecoverableError } from 'bullmq';
import { RefundPaymentStep, RefundPaymentJobData } from './refund-payment.job';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { MockCorrelationService, createMockJob } from '../../../../testing';

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
    const jobData: RefundPaymentJobData = {
      orderId: 1,
      paymentId: 10,
      amount: 49.99,
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: 49.99,
      reason: 'Order cancelled',
    });
  });

  it('passes checkout compensation reason to use case', async () => {
    const jobData: RefundPaymentJobData = {
      orderId: 1,
      paymentId: 10,
      amount: 35.5,
      reason: 'Checkout compensation',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: 35.5,
      reason: 'Checkout compensation',
    });
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
      amount: 25,
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
      amount: 25,
      reason: 'Order cancelled',
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      UnrecoverableError,
    );
  });
});
