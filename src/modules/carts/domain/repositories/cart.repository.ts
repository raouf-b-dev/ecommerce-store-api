import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Cart } from '../entities/cart';
import { CreateCartDto } from '../../presentation/dto/create-cart.dto';

export abstract class CartRepository {
  abstract findById(id: number): Promise<Result<Cart, RepositoryError>>;
  abstract findByCustomerId(
    customerId: number,
  ): Promise<Result<Cart, RepositoryError>>;
  abstract findBySessionId(
    sessionId: number,
  ): Promise<Result<Cart, RepositoryError>>;
  abstract create(dto: CreateCartDto): Promise<Result<Cart, RepositoryError>>;
  abstract update(cart: Cart): Promise<Result<Cart, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
  abstract mergeCarts(
    guestCart: Cart,
    userCart: Cart,
  ): Promise<Result<Cart, RepositoryError>>;
}
