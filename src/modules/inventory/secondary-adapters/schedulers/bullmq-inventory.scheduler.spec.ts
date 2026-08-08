import { Queue } from 'bullmq';
import { BullMqInventoryScheduler } from './bullmq-inventory.scheduler';
import { JobNames } from 'src/infrastructure/jobs/job-names';

describe('BullMqInventoryScheduler', () => {
  let scheduler: BullMqInventoryScheduler;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'inventory-reconciliation-job' }),
    } as unknown as jest.Mocked<Queue>;

    scheduler = new BullMqInventoryScheduler(mockQueue);
  });

  describe('onModuleInit', () => {
    it('should schedule inventory reconciliation audit job on module init', async () => {
      await scheduler.onModuleInit();

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.INVENTORY_RECONCILIATION,
        {},
        {
          repeat: { pattern: '0 4 * * *' },
          jobId: 'inventory-reconciliation-job',
        },
      );
    });
  });

  describe('scheduleReconciliationJob', () => {
    it('should return success result when job is added to queue', async () => {
      const result = await scheduler.scheduleReconciliationJob();

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toEqual({ jobId: 'inventory-reconciliation-job' });
      }
    });

    it('should return infrastructure error when queue fails', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await scheduler.scheduleReconciliationJob();

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toContain(
          'Failed to schedule inventory reconciliation audit job',
        );
      }
    });
  });
});
