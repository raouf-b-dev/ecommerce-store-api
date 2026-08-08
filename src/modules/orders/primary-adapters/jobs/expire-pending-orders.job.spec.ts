import { ExpirePendingOrdersJob } from './expire-pending-orders.job';
import { ExpirePendingOrdersUseCase } from '../../core/application/usecases/expire-pending-orders/expire-pending-orders.usecase';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { Job } from 'bullmq';

describe('ExpirePendingOrdersJob', () => {
  let jobHandler: ExpirePendingOrdersJob;
  let mockUseCase: jest.Mocked<ExpirePendingOrdersUseCase>;
  let mockCorrelation: jest.Mocked<CorrelationService>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(Result.success({ cancelledCount: 3 })),
    } as unknown as jest.Mocked<ExpirePendingOrdersUseCase>;

    mockCorrelation = {
      getId: jest.fn().mockReturnValue('test-correlation-id'),
      setId: jest.fn(),
      runWithId: jest.fn(),
    } as unknown as jest.Mocked<CorrelationService>;

    jobHandler = new ExpirePendingOrdersJob(mockUseCase, mockCorrelation);
  });

  it('should execute pending orders expiration use case successfully', async () => {
    const mockJob = {
      name: 'expire-pending-orders',
      data: {},
    } as unknown as Job<void>;

    const result = await jobHandler.handle(mockJob);

    expect(result).toEqual({ cancelledCount: 3 });
    expect(mockUseCase.execute).toHaveBeenCalledWith({
      expirationMinutes: 30,
    });
  });

  it('should throw error if use case fails', async () => {
    mockUseCase.execute.mockResolvedValueOnce(
      ErrorFactory.DomainError('Expiration failed'),
    );

    const mockJob = {
      name: 'expire-pending-orders',
      data: {},
    } as unknown as Job<void>;

    await expect(jobHandler.handle(mockJob)).rejects.toThrow();
  });
});
