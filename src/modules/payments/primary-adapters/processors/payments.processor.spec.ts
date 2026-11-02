import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsProcessor } from './payments.processor';
import { SimulateMockPaymentWebhookJob } from '../jobs/simulate-mock-payment-webhook.job';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { createMockJob } from '../../../../testing';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { PaymentWebhookResult } from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';

describe('PaymentsProcessor', () => {
  let processor: PaymentsProcessor;
  let handle: jest.MockedFunction<SimulateMockPaymentWebhookJob['handle']>;

  beforeEach(async () => {
    handle = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsProcessor,
        {
          provide: SimulateMockPaymentWebhookJob,
          useValue: { handle },
        },
      ],
    }).compile();

    processor = module.get(PaymentsProcessor);
  });

  it('routes SIMULATE_MOCK_PAYMENT_WEBHOOK to simulateMockPaymentWebhookJob', async () => {
    const mockJob = createMockJob(JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK, {
      paymentIntentId: 'pi_test',
    });

    const webhookResult: PaymentWebhookResult = {
      orderId: 1,
      paymentId: 1,
      status: PaymentStatusType.COMPLETED,
    };
    handle.mockResolvedValue(webhookResult);

    await processor.process(mockJob);

    expect(handle).toHaveBeenCalledWith(mockJob);
  });

  it('throws on unknown job name', async () => {
    const mockJob = createMockJob('unknown-job', {});

    await expect(processor.process(mockJob)).rejects.toThrow(
      'Unknown job name: unknown-job',
    );
  });
});
