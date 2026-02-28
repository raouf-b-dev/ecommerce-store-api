import { ReservationRepository } from '../../core/domain/repositories/reservation.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Reservation } from '../../core/domain/entities/reservation';
import { ReserveStockDto } from '../../primary-adapters/dto/reserve-stock.dto';

export class MockReservationRepository implements ReservationRepository {
  save = jest.fn<
    Promise<Result<Reservation, RepositoryError>>,
    [ReserveStockDto]
  >();
  findById = jest.fn<Promise<Result<Reservation, RepositoryError>>, [number]>();
  findByOrderId = jest.fn<
    Promise<Result<Reservation, RepositoryError>>,
    [number]
  >();
  findAllByOrderId = jest.fn<
    Promise<Result<Reservation[], RepositoryError>>,
    [number]
  >();
  update = jest.fn<
    Promise<Result<Reservation, RepositoryError>>,
    [Reservation]
  >();
  findPendingExpired = jest.fn<
    Promise<Result<Reservation[], RepositoryError>>,
    [Date]
  >();
  confirm = jest.fn<
    Promise<Result<Reservation, RepositoryError>>,
    [Reservation]
  >();
  release = jest.fn<
    Promise<Result<Reservation, RepositoryError>>,
    [Reservation]
  >();

  mockSuccessfulSave(reservation: Reservation): void {
    this.save.mockResolvedValue(Result.success(reservation));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindById(reservation: Reservation): void {
    this.findById.mockResolvedValue(Result.success(reservation));
  }

  mockReservationNotFound(id: number): void {
    this.findById.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Reservation with id ${id} not found`),
      ),
    );
  }

  mockSuccessfulFindByOrderId(reservation: Reservation): void {
    this.findByOrderId.mockResolvedValue(Result.success(reservation));
  }

  mockReservationNotFoundForOrder(orderId: number): void {
    this.findByOrderId.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Reservation not found for order ${orderId}`),
      ),
    );
  }

  mockSuccessfulFindAllByOrderId(reservations: Reservation[]): void {
    this.findAllByOrderId.mockResolvedValue(Result.success(reservations));
  }

  mockFindAllByOrderIdFailure(errorMessage: string): void {
    this.findAllByOrderId.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulUpdate(reservation: Reservation): void {
    this.update.mockResolvedValue(Result.success(reservation));
  }

  mockUpdateFailure(errorMessage: string): void {
    this.update.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindPendingExpired(reservations: Reservation[]): void {
    this.findPendingExpired.mockResolvedValue(Result.success(reservations));
  }

  mockSuccessfulConfirm(reservation: Reservation): void {
    this.confirm.mockResolvedValue(Result.success(reservation));
  }

  mockConfirmFailure(errorMessage: string): void {
    this.confirm.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulRelease(reservation: Reservation): void {
    this.release.mockResolvedValue(Result.success(reservation));
  }

  mockReleaseFailure(errorMessage: string): void {
    this.release.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }
}

export class ReservationRepositoryMockFactory {
  static createMock(): MockReservationRepository {
    return new MockReservationRepository();
  }
}
