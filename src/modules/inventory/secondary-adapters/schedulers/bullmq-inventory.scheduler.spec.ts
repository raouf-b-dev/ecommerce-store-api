import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BullMqInventoryScheduler } from './bullmq-inventory.scheduler';
import { JobNames } from 'src/infrastructure/jobs/job-names';
import { ApplicationLifecyclePort } from 'src/shared-kernel/domain/interfaces/application-lifecycle.port';
import {
  MockApplicationLifecycle,
  createMockQueue,
  ResultAssertionHelper,
} from 'src/testing';

describe('BullMqInventoryScheduler', () => {
  let scheduler: BullMqInventoryScheduler;
  let mockQueue: jest.Mocked<Queue>;
  let lifecycle: MockApplicationLifecycle;

  beforeEach(async () => {
    mockQueue = createMockQueue('inventory');
    lifecycle = new MockApplicationLifecycle();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullMqInventoryScheduler,
        {
          provide: getQueueToken('inventory'),
          useValue: mockQueue,
        },
        {
          provide: ApplicationLifecyclePort,
          useValue: lifecycle,
        },
      ],
    }).compile();

    scheduler = module.get<BullMqInventoryScheduler>(BullMqInventoryScheduler);
  });

  describe('onModuleInit', () => {
    it('should schedule inventory reconciliation and sweeper jobs on module init', async () => {
      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        'inventory-reconciliation-job',
        { pattern: '0 4 * * *' },
        { name: JobNames.INVENTORY_RECONCILIATION, data: {} },
      );
      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        'sweep-expired-reservations-job',
        { pattern: '*/5 * * * *' },
        { name: JobNames.SWEEP_EXPIRED_RESERVATIONS, data: {} },
      );
    });

    it('should skip queue.upsertJobScheduler when shutting down', async () => {
      lifecycle.isShuttingDown = true;

      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).not.toHaveBeenCalled();
    });
  });

  describe('scheduleReconciliationJob', () => {
    it('should return success result when job is added to queue', async () => {
      const result = await scheduler.scheduleReconciliationJob();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({ jobId: 'inventory-reconciliation-job' });
    });

    it('should return infrastructure error when queue fails', async () => {
      mockQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error('Redis connection failed'),
      );

      const result = await scheduler.scheduleReconciliationJob();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule inventory reconciliation audit job',
      );
    });
  });

  describe('scheduleSweeperJob', () => {
    it('should return success result when sweeper job is added to queue', async () => {
      const result = await scheduler.scheduleSweeperJob();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        jobId: 'sweep-expired-reservations-job',
      });
    });

    it('should return infrastructure error when queue fails', async () => {
      mockQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error('Redis connection failed'),
      );

      const result = await scheduler.scheduleSweeperJob();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to schedule expired reservations sweeper job',
      );
    });

    it('should return infrastructure error and skip when shutting down', async () => {
      lifecycle.isShuttingDown = true;

      const result = await scheduler.scheduleSweeperJob();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Skipped expired reservations sweeper schedule during shutdown',
      );
      expect(mockQueue.upsertJobScheduler).not.toHaveBeenCalled();
    });
  });
});
