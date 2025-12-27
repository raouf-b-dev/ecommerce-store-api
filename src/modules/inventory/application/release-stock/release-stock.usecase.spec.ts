import { Test, TestingModule } from '@nestjs/testing';
import { ReleaseStockUseCase } from './release-stock.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../inventory.token';
import {
  MockReservationRepository,
  ReservationRepositoryMockFactory,
} from '../../testing/mocks/reservation-repository.mock.factory';
import { ReservationTestFactory } from '../../testing/factories/reservation.test.factory';
import { ReservationStatus } from '../../domain/value-objects/reservation-status';

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
    it('should release stock successfully', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulRelease(reservation);

      const result = await useCase.execute(reservation.id!);

      expect(result.isSuccess).toBe(true);
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });

    it('should return failure if reservation not found', async () => {
      const reservationId = 404;
      reservationRepository.mockReservationNotFound(reservationId);

      const result = await useCase.execute(reservationId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toContain('not found');
      }
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId,
      );
      expect(reservationRepository.release).not.toHaveBeenCalled();
    });

    it('should return failure if repository release fails', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const errorMessage = 'Database error';
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockReleaseFailure(errorMessage);

      const result = await useCase.execute(reservation.id!);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe(errorMessage);
      }
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });

    it('should handle unexpected errors', async () => {
      const reservationId = 500;
      const error = new Error('Unexpected error');
      reservationRepository.findById.mockRejectedValue(error);

      const result = await useCase.execute(reservationId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe('Unexpected UseCase Error');
        expect((result.error as any).cause).toBe(error);
      }
    });

    it('should succeed even if reservation is already released', async () => {
      const reservation = ReservationTestFactory.createReleasedReservation();
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulRelease(reservation);

      const result = await useCase.execute(reservation.id!);

      expect(result.isSuccess).toBe(true);
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
      expect(reservationRepository.release).toHaveBeenCalledWith(reservation);
    });
  });
});
