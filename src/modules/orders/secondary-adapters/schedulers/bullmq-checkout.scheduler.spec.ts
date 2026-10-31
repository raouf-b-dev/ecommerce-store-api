import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
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
import { ScheduleRefundPaymentProps } from '../../core/domain/schedulers/order.scheduler';

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should schedule pending orders expiration job on module init', async () => {
      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        'expire-pending-orders-job',
        { pattern: '*/5 * * * *' },
        { name: JobNames.EXPIRE_PENDING_ORDERS, data: {} },
      );
    });

    it('should skip queue.upsertJobScheduler when shutting down', async () => {
      mockLifecycle.isShuttingDown = true;

      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).not.toHaveBeenCalled();
    });

    it('should demote schedule failure to debug when shutting down mid-add', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      mockQueue.upsertJobScheduler.mockImplementation(() => {
        mockLifecycle.isShuttingDown = true;
        return Promise.reject(new Error('Connection is closed'));
      });

      await scheduler.onModuleInit();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        'Failed to schedule pending orders expiration job (ignored during shutdown)',
      );
    });
  });

  describe('schedulePendingOrdersExpiration', () => {
    it('should return the scheduler id on success', async () => {
      const result = await scheduler.schedulePendingOrdersExpiration();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe('expire-pending-orders-job');
    });

    it('should return an InfrastructureError when upsertJobScheduler fails', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error('Redis connection lost'),
      );

      const result = await scheduler.schedulePendingOrdersExpiration();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule pending orders expiration job',
      );
    });
  });

  describe('scheduleRefundPayment', () => {
    it('schedules refund with stable payment-based jobId and correct payload', async () => {
      const props: ScheduleRefundPaymentProps = {
        orderId: 42,
        paymentId: 101,
        amount: 89.99,
        reason: 'Order cancelled',
      };

      const result = await scheduler.scheduleRefundPayment(props);

      ResultAssertionHelper.assertResultSuccess(result);
      const expectedJobId = jobConfigService.getJobId(
        JobNames.REFUND_PAYMENT,
        'payment-101',
      );
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

    it('schedules a remaining-mode refund with the same payment-based jobId', async () => {
      const props: ScheduleRefundPaymentProps = {
        orderId: 42,
        paymentId: 101,
        mode: 'remaining',
        reason: 'Surplus payment refund',
      };

      const result = await scheduler.scheduleRefundPayment(props);

      ResultAssertionHelper.assertResultSuccess(result);
      const expectedJobId = jobConfigService.getJobId(
        JobNames.REFUND_PAYMENT,
        'payment-101',
      );
      expect(result.value).toBe(expectedJobId);

      expect(mockFlowProducer.add).toHaveBeenCalledWith({
        name: JobNames.REFUND_PAYMENT,
        queueName: 'checkout',
        data: {
          orderId: 42,
          paymentId: 101,
          mode: 'remaining',
          reason: 'Surplus payment refund',
          correlationId: 'test-correlation-id',
        },
        opts: expect.objectContaining({
          jobId: expectedJobId,
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
