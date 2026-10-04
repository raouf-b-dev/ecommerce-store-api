import { Test, TestingModule } from '@nestjs/testing';
import { InventoryProcessor } from './inventory.processor';
import { InventoryReconciliationJob } from './primary-adapters/jobs/inventory-reconciliation.job';
import { SweepExpiredReservationsJob } from './primary-adapters/jobs/sweep-expired-reservations.job';
import { JobNames } from '../../infrastructure/jobs/job-names';
import { Job } from 'bullmq';
import { createMockQueue } from '../../testing';

describe('InventoryProcessor', () => {
  let processor: InventoryProcessor;
  let reconciliationJob: { handle: jest.Mock };
  let sweeperJob: { handle: jest.Mock };

  beforeEach(async () => {
    reconciliationJob = { handle: jest.fn() };
    sweeperJob = { handle: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryProcessor,
        {
          provide: InventoryReconciliationJob,
          useValue: reconciliationJob,
        },
        {
          provide: SweepExpiredReservationsJob,
          useValue: sweeperJob,
        },
      ],
    }).compile();

    processor = module.get<InventoryProcessor>(InventoryProcessor);
  });

  it('delegates INVENTORY_RECONCILIATION job to reconciliation handler', async () => {
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(
      queue,
      JobNames.INVENTORY_RECONCILIATION,
      undefined,
    );
    reconciliationJob.handle.mockResolvedValue(undefined);

    await processor.process(job);

    expect(reconciliationJob.handle).toHaveBeenCalledWith(job);
    expect(sweeperJob.handle).not.toHaveBeenCalled();
  });

  it('delegates SWEEP_EXPIRED_RESERVATIONS job to sweeper handler', async () => {
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(
      queue,
      JobNames.SWEEP_EXPIRED_RESERVATIONS,
      undefined,
    );
    sweeperJob.handle.mockResolvedValue({ sweptCount: 2 });

    await processor.process(job);

    expect(sweeperJob.handle).toHaveBeenCalledWith(job);
    expect(reconciliationJob.handle).not.toHaveBeenCalled();
  });

  it('throws an error for unknown job names', async () => {
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(queue, 'unknown-job', undefined);

    await expect(processor.process(job)).rejects.toThrow(
      'Unknown job name: unknown-job',
    );
  });
});
