import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PaymentsProcessor } from './payments.processor';
import { SimulateMockPaymentWebhookJob } from '../jobs/simulate-mock-payment-webhook.job';
import { JobNames } from '../../../../infrastructure/jobs/job-names';

describe('PaymentsProcessor', () => {
  let processor: PaymentsProcessor;
  let mockJobHandler: jest.Mocked<SimulateMockPaymentWebhookJob>;

  beforeEach(async () => {
    mockJobHandler = {
      handle: jest.fn(),
    } as unknown as jest.Mocked<SimulateMockPaymentWebhookJob>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsProcessor,
        {
          provide: SimulateMockPaymentWebhookJob,
          useValue: mockJobHandler,
        },
      ],
    }).compile();

    processor = module.get<PaymentsProcessor>(PaymentsProcessor);
  });

  it('routes SIMULATE_MOCK_PAYMENT_WEBHOOK to simulateMockPaymentWebhookJob', async () => {
    const mockJob = {
      id: 'job-1',
      name: JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
      data: { paymentIntentId: 'pi_test' },
    } as Job;

    mockJobHandler.handle.mockResolvedValue({
      status: 'completed',
      data: { orderId: 1, paymentId: 1, status: 'COMPLETED' },
    } as any);

    await processor.process(mockJob);

    expect(mockJobHandler.handle).toHaveBeenCalledWith(mockJob);
  });

  it('throws on unknown job name', async () => {
    const mockJob = {
      id: 'job-2',
      name: 'unknown-job',
      data: {},
    } as Job;

    await expect(processor.process(mockJob)).rejects.toThrow(
      'Unknown job name: unknown-job',
    );
  });
});
