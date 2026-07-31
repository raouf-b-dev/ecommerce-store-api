import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../entities/cart';
export interface CreateCartInput {
  userId: number;
}

export abstract class CartRepository {
  abstract findById(id: number): Promise<Result<Cart, RepositoryError>>;
  abstract findByuserId(userId: number): Promise<Result<Cart, RepositoryError>>;
  abstract create(dto: CreateCartInput): Promise<Result<Cart, RepositoryError>>;
  abstract update(cart: Cart): Promise<Result<Cart, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
