import { Test, TestingModule } from '@nestjs/testing';
import {
  SimulateMockPaymentWebhookJob,
  SimulateMockPaymentWebhookProps,
} from './simulate-mock-payment-webhook.job';
import { HandlePaymentWebhookService } from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../core/domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { MockCorrelationService, createMockJob } from '../../../../testing';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { JobNames } from '../../../../infrastructure/jobs/job-names';

describe('SimulateMockPaymentWebhookJob', () => {
  let jobHandler: SimulateMockPaymentWebhookJob;
  let executeMock: jest.MockedFunction<HandlePaymentWebhookService['execute']>;
  let mockCorrelation: MockCorrelationService;

  beforeEach(async () => {
    executeMock = jest.fn();
    mockCorrelation = new MockCorrelationService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulateMockPaymentWebhookJob,
        {
          provide: HandlePaymentWebhookService,
          useValue: { execute: executeMock },
        },
        {
          provide: CorrelationService,
          useValue: mockCorrelation,
        },
      ],
    }).compile();

    jobHandler = module.get(SimulateMockPaymentWebhookJob);
  });

  it('delegates to HandlePaymentWebhookService with SUCCEEDED event type, amountMinor, and currency', async () => {
    const jobData: SimulateMockPaymentWebhookProps = {
      paymentIntentId: 'pi_test123',
      transactionId: 'pi_test123',
      metadata: { orderId: '10', cartId: '20' },
      amountMinor: 5000,
      currency: 'USD',
    };

    const mockJob = createMockJob(
      JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
      jobData,
    );

    executeMock.mockResolvedValue(
      Result.success({
        orderId: 10,
        paymentId: 100,
        status: PaymentStatusType.COMPLETED,
      }),
    );

    const result = await jobHandler.handle(mockJob);

    expect(executeMock).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'pi_test123',
      metadata: { orderId: '10', cartId: '20' },
      amountMinor: 5000,
      currency: 'USD',
    });
    expect(result.status).toBe(PaymentStatusType.COMPLETED);
  });

  it('returns failure when HandlePaymentWebhookService fails', async () => {
    const jobData: SimulateMockPaymentWebhookProps = {
      paymentIntentId: 'pi_nonexistent',
      amountMinor: 5000,
      currency: 'USD',
    };

    const mockJob = createMockJob(
      JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
      jobData,
    );

    executeMock.mockResolvedValue(
      ErrorFactory.ServiceError('Payment not found for intent: pi_nonexistent'),
    );

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      'Payment not found for intent: pi_nonexistent',
    );
  });
});
