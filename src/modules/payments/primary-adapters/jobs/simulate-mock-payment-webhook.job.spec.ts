import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import {
  SimulateMockPaymentWebhookJob,
  SimulateMockPaymentWebhookProps,
} from './simulate-mock-payment-webhook.job';
import { HandlePaymentWebhookService } from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../core/domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { MockCorrelationService } from '../../../../testing';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

describe('SimulateMockPaymentWebhookJob', () => {
  let jobHandler: SimulateMockPaymentWebhookJob;
  let mockWebhookService: jest.Mocked<HandlePaymentWebhookService>;
  let mockCorrelation: MockCorrelationService;

  beforeEach(async () => {
    mockWebhookService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<HandlePaymentWebhookService>;
    mockCorrelation = new MockCorrelationService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulateMockPaymentWebhookJob,
        {
          provide: HandlePaymentWebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: CorrelationService,
          useValue: mockCorrelation,
        },
      ],
    }).compile();

    jobHandler = module.get<SimulateMockPaymentWebhookJob>(
      SimulateMockPaymentWebhookJob,
    );
  });

  it('delegates to HandlePaymentWebhookService with SUCCEEDED event type', async () => {
    const jobData: SimulateMockPaymentWebhookProps = {
      paymentIntentId: 'pi_test123',
      transactionId: 'pi_test123',
      metadata: { orderId: '10', cartId: '20' },
    };

    const mockJob = {
      data: jobData,
      name: 'simulate-mock-payment-webhook',
    } as Job<SimulateMockPaymentWebhookProps>;

    mockWebhookService.execute.mockResolvedValue(
      Result.success({
        orderId: 10,
        paymentId: 100,
        status: PaymentStatusType.COMPLETED,
      }),
    );

    const result = await jobHandler.handle(mockJob);

    expect(mockWebhookService.execute).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'pi_test123',
      metadata: { orderId: '10', cartId: '20' },
    });
    expect(result.status).toBe(PaymentStatusType.COMPLETED);
  });

  it('returns failure when HandlePaymentWebhookService fails', async () => {
    const jobData: SimulateMockPaymentWebhookProps = {
      paymentIntentId: 'pi_nonexistent',
    };

    const mockJob = {
      data: jobData,
      name: 'simulate-mock-payment-webhook',
    } as Job<SimulateMockPaymentWebhookProps>;

    mockWebhookService.execute.mockResolvedValue(
      ErrorFactory.ServiceError('Payment not found for intent: pi_nonexistent'),
    );

    await expect(jobHandler.handle(mockJob)).rejects.toThrow(
      'Payment not found for intent: pi_nonexistent',
    );
  });
});
