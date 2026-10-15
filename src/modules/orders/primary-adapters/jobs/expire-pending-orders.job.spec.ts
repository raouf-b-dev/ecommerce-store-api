import { Test } from '@nestjs/testing';
import { ExpirePendingOrdersJob } from './expire-pending-orders.job';
import { ExpirePendingOrdersUseCase } from '../../core/application/usecases/expire-pending-orders/expire-pending-orders.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { MockCorrelationService, createMockJob } from '../../../../testing';

describe('ExpirePendingOrdersJob', () => {
  let jobHandler: ExpirePendingOrdersJob;
  let execute: jest.MockedFunction<ExpirePendingOrdersUseCase['execute']>;

  beforeEach(async () => {
    execute = jest
      .fn()
      .mockResolvedValue(Result.success({ cancelledCount: 3 }));

    const module = await Test.createTestingModule({
      providers: [
        ExpirePendingOrdersJob,
        {
          provide: ExpirePendingOrdersUseCase,
          useValue: { execute },
        },
        { provide: CorrelationService, useClass: MockCorrelationService },
      ],
    }).compile();

    jobHandler = module.get(ExpirePendingOrdersJob);
  });

  it('should execute pending orders expiration use case successfully', async () => {
    const mockJob = createMockJob('expire-pending-orders', undefined);

    const result = await jobHandler.handle(mockJob);

    expect(result).toEqual({ cancelledCount: 3 });
    expect(execute).toHaveBeenCalledWith({
      expirationMinutes: 30,
    });
  });

  it('should throw error if use case fails', async () => {
    execute.mockResolvedValueOnce(
      ErrorFactory.DomainError('Expiration failed'),
    );

    const mockJob = createMockJob('expire-pending-orders', undefined);

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
  });
});
