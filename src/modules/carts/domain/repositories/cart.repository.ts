// src/modules/carts/domain/repositories/cart.repository.ts
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Cart } from '../entities/cart';

export abstract class CartRepository {
  abstract findById(id: string): Promise<Result<Cart, RepositoryError>>;
  abstract findByCustomerId(
    customerId: string,
  ): Promise<Result<Cart, RepositoryError>>;
  abstract findBySessionId(
    sessionId: string,
  ): Promise<Result<Cart, RepositoryError>>;
  abstract save(cart: Cart): Promise<Result<Cart, RepositoryError>>;
  abstract update(cart: Cart): Promise<Result<Cart, RepositoryError>>;
  abstract delete(id: string): Promise<Result<void, RepositoryError>>;
  abstract mergeCarts(
    guestCart: Cart,
    userCart: Cart,
  ): Promise<Result<Cart, RepositoryError>>;
}
