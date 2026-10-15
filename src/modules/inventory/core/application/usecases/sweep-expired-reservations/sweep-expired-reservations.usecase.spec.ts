import { Test, TestingModule } from '@nestjs/testing';
import { SweepExpiredReservationsUseCase } from './sweep-expired-reservations.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';
import {
  MockReservationRepository,
  ReservationRepositoryMockFactory,
  ReservationTestFactory,
} from '../../../../testing';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ReservationStatus } from '../../../domain/value-objects/reservation-status';

describe('SweepExpiredReservationsUseCase', () => {
  let useCase: SweepExpiredReservationsUseCase;
  let reservations: MockReservationRepository;

  beforeEach(async () => {
    reservations = ReservationRepositoryMockFactory.createMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SweepExpiredReservationsUseCase,
        {
          provide: POSTGRES_RESERVATION_REPOSITORY,
          useValue: reservations,
        },
      ],
    }).compile();

    useCase = module.get<SweepExpiredReservationsUseCase>(
      SweepExpiredReservationsUseCase,
    );
  });

  it('sweeps expired reservations and returns swept count on success', async () => {
    const expired1 = ReservationTestFactory.createPendingReservation({ id: 1 });
    const expired2 = ReservationTestFactory.createPendingReservation({ id: 2 });
    reservations.findPendingExpired
      .mockResolvedValueOnce(Result.success([expired1, expired2]))
      .mockResolvedValueOnce(Result.success([]));
    reservations.mockSuccessfulExpire(expired1);
    reservations.mockSuccessfulExpire(expired2);

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(2);
    expect(result.value.failedCount).toBe(0);
    expect(expired1.status).toBe(ReservationStatus.EXPIRED);
    expect(expired2.status).toBe(ReservationStatus.EXPIRED);
    expect(reservations.expire).toHaveBeenCalledTimes(2);
  });

  it('returns zero swept when no expired reservations are found', async () => {
    reservations.mockSuccessfulFindPendingExpired([]);

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(0);
    expect(result.value.failedCount).toBe(0);
    expect(reservations.expire).not.toHaveBeenCalled();
  });

  it('respects custom batchSize and asOfDate', async () => {
    const asOfDate = new Date('2026-10-04T12:00:00Z');
    const batchSize = 25;
    reservations.mockSuccessfulFindPendingExpired([]);

    const result = await useCase.execute({ asOfDate, batchSize });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(reservations.findPendingExpired).toHaveBeenCalledWith(
      asOfDate,
      batchSize,
      undefined,
    );
  });

  it('returns failure when repository fails to find expired reservations', async () => {
    reservations.findPendingExpired.mockResolvedValue(
      Result.failure(new RepositoryError('Database query failure')),
    );

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to fetch expired reservations',
      UseCaseError,
    );
  });

  it('increments failedCount when expiring an individual reservation fails to persist', async () => {
    const expired1 = ReservationTestFactory.createPendingReservation({ id: 1 });
    const expired2 = ReservationTestFactory.createPendingReservation({ id: 2 });
    reservations.findPendingExpired
      .mockResolvedValueOnce(Result.success([expired1, expired2]))
      .mockResolvedValueOnce(Result.success([]));
    reservations.mockExpireFailure('Deadlock detected');

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(0);
    expect(result.value.failedCount).toBe(2);
  });

  it('increments failedCount when reservation domain transition to expired fails', async () => {
    // Already released reservation cannot be expired by domain
    const released = ReservationTestFactory.createReleasedReservation({
      id: 3,
    });
    reservations.findPendingExpired
      .mockResolvedValueOnce(Result.success([released]))
      .mockResolvedValueOnce(Result.success([]));

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(0);
    expect(result.value.failedCount).toBe(1);
    expect(reservations.expire).not.toHaveBeenCalled();
  });

  it('processes batches in a loop and excludes failed ids from subsequent queries', async () => {
    const failingRes = ReservationTestFactory.createPendingReservation({
      id: 101,
    });
    const succeedingRes1 = ReservationTestFactory.createPendingReservation({
      id: 102,
    });
    const succeedingRes2 = ReservationTestFactory.createPendingReservation({
      id: 103,
    });

    // Batch 1 returns [failingRes, succeedingRes1]
    // Batch 2 returns [succeedingRes2]
    // Batch 3 returns []
    reservations.findPendingExpired
      .mockResolvedValueOnce(Result.success([failingRes, succeedingRes1]))
      .mockResolvedValueOnce(Result.success([succeedingRes2]))
      .mockResolvedValueOnce(Result.success([]));

    reservations.expire.mockImplementation((res) => {
      if (res.id === 101) {
        return Promise.resolve(
          Result.failure(new RepositoryError('Persistent failure')),
        );
      }
      return Promise.resolve(Result.success(res));
    });

    const result = await useCase.execute({ batchSize: 2 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(2);
    expect(result.value.failedCount).toBe(1);

    expect(reservations.findPendingExpired).toHaveBeenCalledTimes(3);
    // Batch 1 has no exclusions
    expect(reservations.findPendingExpired).toHaveBeenNthCalledWith(
      1,
      expect.any(Date),
      2,
      undefined,
    );
    // Batch 2 excludes failed id 101
    expect(reservations.findPendingExpired).toHaveBeenNthCalledWith(
      2,
      expect.any(Date),
      2,
      [101],
    );
    // Batch 3 excludes failed id 101
    expect(reservations.findPendingExpired).toHaveBeenNthCalledWith(
      3,
      expect.any(Date),
      2,
      [101],
    );
  });

  it('throws an error if a reservation returned from repository has null id', async () => {
    const invalidReservation = ReservationTestFactory.createPendingReservation({
      id: null,
    });
    reservations.findPendingExpired.mockResolvedValueOnce(
      Result.success([invalidReservation]),
    );

    await expect(useCase.execute()).rejects.toThrow(
      'Expired reservation fetched from repository has no id',
    );
  });

  it('stops processing and sets batchCapHit when maxBatches limit is reached', async () => {
    const res1 = ReservationTestFactory.createPendingReservation({ id: 1 });
    const res2 = ReservationTestFactory.createPendingReservation({ id: 2 });
    const res3 = ReservationTestFactory.createPendingReservation({ id: 3 });

    reservations.findPendingExpired
      .mockResolvedValueOnce(Result.success([res1]))
      .mockResolvedValueOnce(Result.success([res2]))
      .mockResolvedValueOnce(Result.success([res3]));
    reservations.mockSuccessfulExpire(res1);
    reservations.mockSuccessfulExpire(res2);
    reservations.mockSuccessfulExpire(res3);

    const result = await useCase.execute({ batchSize: 1, maxBatches: 2 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(2);
    expect(result.value.batchCapHit).toBe(true);
    expect(reservations.findPendingExpired).toHaveBeenCalledTimes(2);
  });
});
