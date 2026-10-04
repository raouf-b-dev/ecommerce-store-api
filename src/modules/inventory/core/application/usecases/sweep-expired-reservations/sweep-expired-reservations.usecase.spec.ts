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
    reservations.mockSuccessfulFindPendingExpired([expired1, expired2]);
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
    reservations.mockSuccessfulFindPendingExpired([expired1, expired2]);
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
    reservations.mockSuccessfulFindPendingExpired([released]);

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sweptCount).toBe(0);
    expect(result.value.failedCount).toBe(1);
    expect(reservations.expire).not.toHaveBeenCalled();
  });
});
