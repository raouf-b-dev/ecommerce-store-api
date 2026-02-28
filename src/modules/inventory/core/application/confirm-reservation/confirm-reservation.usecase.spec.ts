import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmReservationUseCase } from './confirm-reservation.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../inventory.token';
import {
  MockReservationRepository,
  ReservationRepositoryMockFactory,
} from '../../../testing/mocks/reservation-repository.mock.factory';
import { ReservationTestFactory } from '../../../testing/factories/reservation.test.factory';
import { ReservationStatus } from '../../domain/value-objects/reservation-status';

describe('ConfirmReservationUseCase', () => {
  let useCase: ConfirmReservationUseCase;
  let reservationRepository: MockReservationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmReservationUseCase,
        {
          provide: POSTGRES_RESERVATION_REPOSITORY,
          useFactory: () => ReservationRepositoryMockFactory.createMock(),
        },
      ],
    }).compile();

    useCase = module.get<ConfirmReservationUseCase>(ConfirmReservationUseCase);
    reservationRepository = module.get(POSTGRES_RESERVATION_REPOSITORY);
  });

  afterEach(() => {
    reservationRepository.reset();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should confirm reservation successfully', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockSuccessfulConfirm(reservation);

      const result = await useCase.execute(reservation.id!);

      expect(result.isSuccess).toBe(true);
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
      expect(reservationRepository.confirm).toHaveBeenCalledWith(reservation);
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
      expect(reservationRepository.confirm).not.toHaveBeenCalled();
    });

    it('should return failure if reservation is expired', async () => {
      const reservation = ReservationTestFactory.createExpiredReservation({
        status: ReservationStatus.PENDING, // Force status to PENDING but with expired date
      });
      reservationRepository.mockSuccessfulFindById(reservation);

      const result = await useCase.execute(reservation.id!);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe('Cannot confirm expired reservation');
      }
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservationRepository.confirm).not.toHaveBeenCalled();
    });

    it('should return failure if reservation is not pending', async () => {
      const reservation = ReservationTestFactory.createConfirmedReservation();
      reservationRepository.mockSuccessfulFindById(reservation);

      const result = await useCase.execute(reservation.id!);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toContain('Cannot confirm reservation in');
      }
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservationRepository.confirm).not.toHaveBeenCalled();
    });

    it('should return failure if repository confirm fails', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const errorMessage = 'Database error';
      reservationRepository.mockSuccessfulFindById(reservation);
      reservationRepository.mockConfirmFailure(errorMessage);

      const result = await useCase.execute(reservation.id!);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe(errorMessage);
      }
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservation.id,
      );
      expect(reservationRepository.confirm).toHaveBeenCalledWith(reservation);
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
  });
});
