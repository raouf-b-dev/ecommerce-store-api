import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SweepExpiredReservationsJob } from './sweep-expired-reservations.job';
import { SweepExpiredReservationsUseCase } from '../../core/application/usecases/sweep-expired-reservations/sweep-expired-reservations.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { MockCorrelationService, createMockQueue } from '../../../../testing';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

describe('SweepExpiredReservationsJob', () => {
  let handler: SweepExpiredReservationsJob;
  let execute: jest.MockedFunction<SweepExpiredReservationsUseCase['execute']>;

  beforeEach(async () => {
    execute = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        SweepExpiredReservationsJob,
        {
          provide: SweepExpiredReservationsUseCase,
          useValue: { execute },
        },
        { provide: CorrelationService, useClass: MockCorrelationService },
      ],
    }).compile();

    handler = module.get(SweepExpiredReservationsJob);
  });

  it('delegates to the use case and returns swept count on success', async () => {
    execute.mockResolvedValue(
      Result.success({ sweptCount: 5, failedCount: 0 }),
    );
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(queue, 'sweep-expired-reservations', undefined);

    const result = await handler.handle(job);

    expect(result).toEqual({ sweptCount: 5 });
    expect(execute).toHaveBeenCalled();
  });

  it('throws when the use case fails', async () => {
    execute.mockResolvedValue(ErrorFactory.UseCaseError('Sweeper failure'));
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(queue, 'sweep-expired-reservations', undefined);

    await expect(handler.handle(job)).rejects.toThrow();
  });
});
