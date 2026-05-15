import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Reservation } from '../entities/reservation';

export interface ReservationItemInput {
  productId: number;
  quantity: number;
}

export interface ReservationInput {
  orderId: number;
  items: ReservationItemInput[];
}
export abstract class ReservationRepository {
  abstract save(
    dto: ReservationInput,
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
