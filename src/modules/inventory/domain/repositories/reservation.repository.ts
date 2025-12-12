import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Reservation } from '../entities/reservation';

import { ReserveStockDto } from '../../presentation/dto/reserve-stock.dto';

export abstract class ReservationRepository {
  abstract save(
    dto: ReserveStockDto,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findById(id: string): Promise<Result<Reservation, RepositoryError>>;
  abstract findByOrderId(
    orderId: string,
  ): Promise<Result<Reservation, RepositoryError>>;
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
