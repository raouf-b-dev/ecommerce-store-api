import {
  MockReservationRepository,
  ReservationRepositoryMockFactory,
  ReservationTestFactory,
} from 'src/modules/inventory/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { ReleaseStockUseCase } from './release-stock.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';
import { ReservationStatus } from '../../../domain/value-objects/reservation-status';

import { ResultAssertionHelper } from 'src/testing';

describe('ReleaseStockUseCase', () => {
  let useCase: ReleaseStockUseCase;
  let reservationRepository: MockReservationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseStockUseCase,
        {
          provide: POSTGRES_RESERVATION_REPOSITORY,
          useFactory: () => ReservationRepositoryMockFactory.createMock(),
        },
      ],
    }).compile();

    useCase = module.get<ReleaseStockUseCase>(ReleaseStockUseCase);
    reservationRepository = module.get(POSTGRES_RESERVATION_REPOSITORY);
  });

  afterEach(() => {
    reservationRepository.reset();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should release stock successfully for pending reservation', async () => {
      const reservationId = 1;
      const reservation = ReservationTestFactory.createPendingReservation({
        id: reservationId,
      });
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulRelease(reservation);

      const result = await useCase.execute(reservationId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });

    it('should return confirmed reservation to stock successfully', async () => {
      const reservationId = 1;
      const reservation = ReservationTestFactory.createConfirmedReservation({
        id: reservationId,
      });
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulRelease(reservation);

      const result = await useCase.execute(reservationId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });

    it('should return failure if reservation not found', async () => {
      const reservationId = 404;
      reservationRepository.mockReservationNotFound(reservationId);

      const result = await useCase.execute(reservationId);

      ResultAssertionHelper.assertResultFailure(result, 'not found');
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(reservationRepository.release).not.toHaveBeenCalled();
    });

    it('should return failure if repository release fails', async () => {
      const reservationId = 1;
      const reservation = ReservationTestFactory.createPendingReservation({
        id: reservationId,
      });
      const errorMessage = 'Database error';
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockReleaseFailure(errorMessage);

      const result = await useCase.execute(reservationId);

      ResultAssertionHelper.assertResultFailure(result, errorMessage);
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });

    it('should succeed even if reservation is already released', async () => {
      const reservationId = 1;
      const reservation = ReservationTestFactory.createReleasedReservation({
        id: reservationId,
      });
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulRelease(reservation);

      const result = await useCase.execute(reservationId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });
  });
});
