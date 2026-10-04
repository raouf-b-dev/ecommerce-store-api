import { Test } from '@nestjs/testing';
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
      paymentId: 10,
      amount: 49.99,
      orderId: 1,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: 49.99,
      reason: 'Order cancellation refund',
    });
  });

  it('refunds payment using orderTotal fallback when amount is not provided', async () => {
    const jobData: RefundPaymentJobData = {
      paymentId: 10,
      orderTotal: 35.5,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await jobHandler.handle(mockJob);

    expect(execute).toHaveBeenCalledWith({
      paymentId: 10,
      amount: 35.5,
      reason: 'Order cancellation refund',
    });
  });

  it('rejects refund when paymentId is missing', async () => {
    const jobData: RefundPaymentJobData = {
      amount: 50,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects refund when amount is zero', async () => {
    const jobData: RefundPaymentJobData = {
      paymentId: 10,
      amount: 0,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects refund when amount is negative', async () => {
    const jobData: RefundPaymentJobData = {
      paymentId: 10,
      amount: -10,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it('throws error when use case returns failure', async () => {
    execute.mockResolvedValueOnce(
      ErrorFactory.UseCaseError('Payment gateway refund failed'),
    );

    const jobData: RefundPaymentJobData = {
      paymentId: 10,
      amount: 25,
    };
    const mockJob = createMockJob('refund-payment', jobData);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
  });
});
