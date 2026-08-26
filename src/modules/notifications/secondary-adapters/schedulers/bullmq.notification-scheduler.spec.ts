import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BullMqNotificationScheduler } from './bullmq.notification-scheduler';
import { JobNames } from 'src/infrastructure/jobs/job-names';
import { FlowProducerService } from 'src/infrastructure/queue/flow-producer.service';
import { JobConfigService } from 'src/infrastructure/jobs/job-config.service';
import { CorrelationService } from 'src/infrastructure/logging/correlation/correlation.service';
import { ApplicationLifecyclePort } from 'src/shared-kernel/domain/interfaces/application-lifecycle.port';
import {
  MockApplicationLifecycle,
  MockFlowProducerService,
  MockJobConfigService,
  MockCorrelationService,
  createMockQueue,
} from 'src/testing';
import { NotificationDtoTestFactory } from '../../testing/factories/notification-dto.factory';

describe('BullMqNotificationScheduler', () => {
  let scheduler: BullMqNotificationScheduler;
  let mockQueue: jest.Mocked<Queue>;
  let mockFlowProducer: MockFlowProducerService;
  let mockJobConfig: MockJobConfigService;
  let mockCorrelation: MockCorrelationService;
  let lifecycle: MockApplicationLifecycle;

  beforeEach(async () => {
    mockQueue = createMockQueue('notifications');
    mockFlowProducer = new MockFlowProducerService();
    mockJobConfig = new MockJobConfigService();
    mockCorrelation = new MockCorrelationService();
    lifecycle = new MockApplicationLifecycle();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullMqNotificationScheduler,
        {
          provide: FlowProducerService,
          useValue: mockFlowProducer,
        },
        {
          provide: JobConfigService,
          useValue: mockJobConfig,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
        {
          provide: CorrelationService,
          useValue: mockCorrelation,
        },
        {
          provide: ApplicationLifecyclePort,
          useValue: lifecycle,
        },
      ],
    }).compile();

    scheduler = module.get<BullMqNotificationScheduler>(
      BullMqNotificationScheduler,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should schedule cleanup job on module init', async () => {
      await scheduler.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.CLEANUP_NOTIFICATIONS,
        {},
        {
          repeat: { pattern: '0 3 * * *' },
          jobId: 'cleanup-expired-notifications-job',
        },
      );
    });

    it('should skip queue.add when shutting down', async () => {
      lifecycle.isShuttingDown = true;

      await scheduler.onModuleInit();

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should demote schedule failure to debug when shutting down mid-add', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      mockQueue.add.mockImplementation(() => {
        lifecycle.isShuttingDown = true;
        return Promise.reject(new Error('Connection is closed'));
      });

      await scheduler.onModuleInit();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        'Failed to schedule cleanup job (ignored during shutdown)',
      );
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule a notification flow successfully', async () => {
      const notification = NotificationDtoTestFactory.createEntity();

      const result = await scheduler.scheduleNotification(notification);

      expect(result.isSuccess).toBe(true);
      expect(mockFlowProducer.add).toHaveBeenCalled();
    });

    it('should return error when flow scheduling fails', async () => {
      mockFlowProducer.add.mockRejectedValueOnce(
        new Error('Flow producer failed'),
      );
      const notification = NotificationDtoTestFactory.createEntity();

      const result = await scheduler.scheduleNotification(notification);

      expect(result.isFailure).toBe(true);
    });
  });
});
