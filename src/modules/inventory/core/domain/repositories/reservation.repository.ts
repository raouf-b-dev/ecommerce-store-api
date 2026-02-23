import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { Reservation } from '../entities/reservation';

import { ReserveStockDto } from '../../../primary-adapters/dto/reserve-stock.dto';

export abstract class ReservationRepository {
  abstract save(
    dto: ReserveStockDto,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Reservation, RepositoryError>>;
  abstract findByOrderId(
    orderId: number,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findAllByOrderId(
    orderId: number,
  ): Promise<Result<Reservation[], RepositoryError>>;
  abstract update(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findPendingExpired(
    date: Date,
  ): Promise<Result<Reservation[], RepositoryError>>;
  abstract release(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract confirm(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
}
