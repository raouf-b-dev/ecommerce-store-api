import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../entities/cart';
export interface CreateCartInput {
  userId: number;
}

export abstract class CartRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  >;
  abstract findByUserIdForUpdate(
    userId: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  >;
  abstract findById(id: number): Promise<Result<Cart, RepositoryError>>;
  abstract findByuserId(userId: number): Promise<Result<Cart, RepositoryError>>;
  abstract save(
    cart: Cart,
    expectedVersion?: number,
  ): Promise<Result<Cart, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
