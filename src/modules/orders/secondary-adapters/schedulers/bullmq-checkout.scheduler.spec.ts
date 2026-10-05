import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BullMqOrderScheduler } from './bullmq-checkout.scheduler';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import { FlowProducerService } from '../../../../infrastructure/queue/flow-producer.service';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { ApplicationLifecyclePort } from '../../../../shared-kernel/domain/interfaces/application-lifecycle.port';
import {
  MockApplicationLifecycle,
  MockFlowProducerService,
  MockCorrelationService,
  createMockQueue,
  ResultAssertionHelper,
} from '../../../../testing';
import {
  ScheduleRefundPaymentProps,
  getRefundJobId,
} from '../../core/domain/schedulers/order.scheduler';

describe('BullMqOrderScheduler', () => {
  let scheduler: BullMqOrderScheduler;
  let mockQueue: jest.Mocked<Queue>;
  let mockFlowProducer: MockFlowProducerService;
  let mockCorrelation: MockCorrelationService;
  let jobConfigService: JobConfigService;
  let mockLifecycle: MockApplicationLifecycle;

  beforeEach(async () => {
    mockQueue = createMockQueue('checkout');
    mockCorrelation = new MockCorrelationService();
    mockCorrelation.getId.mockReturnValue('test-correlation-id');
    jobConfigService = new JobConfigService();
    mockFlowProducer = new MockFlowProducerService();
    mockLifecycle = new MockApplicationLifecycle();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullMqOrderScheduler,
        {
          provide: JobConfigService,
          useValue: jobConfigService,
        },
        {
          provide: FlowProducerService,
          useValue: mockFlowProducer,
        },
        {
          provide: CorrelationService,
          useValue: mockCorrelation,
        },
        {
          provide: getQueueToken('checkout'),
          useValue: mockQueue,
        },
        {
          provide: ApplicationLifecyclePort,
          useValue: mockLifecycle,
        },
      ],
    }).compile();

    scheduler = module.get<BullMqOrderScheduler>(BullMqOrderScheduler);
  });

  describe('scheduleRefundPayment', () => {
    it('schedules refund with stable jobId and correct payload', async () => {
      const props: ScheduleRefundPaymentProps = {
        orderId: 42,
        paymentId: 101,
        amount: 89.99,
        reason: 'Order cancelled',
      };

      const result = await scheduler.scheduleRefundPayment(props);

      ResultAssertionHelper.assertResultSuccess(result);
      const expectedJobId = getRefundJobId(42);
      expect(result.value).toBe(expectedJobId);

      expect(mockFlowProducer.add).toHaveBeenCalledWith({
        name: JobNames.REFUND_PAYMENT,
        queueName: 'checkout',
        data: {
          orderId: 42,
          paymentId: 101,
          amount: 89.99,
          reason: 'Order cancelled',
          correlationId: 'test-correlation-id',
        },
        opts: expect.objectContaining({
          jobId: expectedJobId,
          attempts: 8,
        }),
      });
    });

    it('returns an InfrastructureError when flowProducer.add throws', async () => {
      mockFlowProducer.add.mockRejectedValueOnce(
        new Error('Redis connection lost'),
      );

      const props: ScheduleRefundPaymentProps = {
        orderId: 42,
        paymentId: 101,
        amount: 89.99,
        reason: 'Order cancelled',
      };

      const result = await scheduler.scheduleRefundPayment(props);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule payment refund',
      );
    });
  });
});
