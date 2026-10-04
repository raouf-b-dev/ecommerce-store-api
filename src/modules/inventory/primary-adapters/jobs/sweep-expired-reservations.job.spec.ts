import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SweepExpiredReservationsJob } from './sweep-expired-reservations.job';
import { SweepExpiredReservationsUseCase } from '../../core/application/usecases/sweep-expired-reservations/sweep-expired-reservations.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { MockCorrelationService, createMockJob } from '../../../../testing';
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

  it('delegates to the use case and returns swept and failed counts on success', async () => {
    execute.mockResolvedValue(
      Result.success({ sweptCount: 5, failedCount: 0 }),
    );
    const job = createMockJob('sweep-expired-reservations', undefined);

    const result = await handler.handle(job);

    expect(result).toEqual({ sweptCount: 5, failedCount: 0 });
    expect(execute).toHaveBeenCalledWith({ maxBatches: 50 });
  });

  it('logs an error when failedCount is greater than 0', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    execute.mockResolvedValue(
      Result.success({ sweptCount: 4, failedCount: 2 }),
    );
    const job = createMockJob('sweep-expired-reservations', undefined);

    const result = await handler.handle(job);

    expect(result).toEqual({ sweptCount: 4, failedCount: 2 });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('encountered 2 failures'),
    );
    errorSpy.mockRestore();
  });

  it('logs a warning when batch cap is hit', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    execute.mockResolvedValue(
      Result.success({ sweptCount: 500, failedCount: 0, batchCapHit: true }),
    );
    const job = createMockJob('sweep-expired-reservations', undefined);

    const result = await handler.handle(job);

    expect(result).toEqual({ sweptCount: 500, failedCount: 0 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('reached the batch cap of 50'),
    );
    warnSpy.mockRestore();
  });

  it('throws when the use case fails', async () => {
    execute.mockResolvedValue(ErrorFactory.UseCaseError('Sweeper failure'));
    const job = createMockJob('sweep-expired-reservations', undefined);

    await expect(handler.handle(job)).rejects.toThrow();
  });
});
