import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Order } from '../entities/order';

export abstract class OrderRepository {
  abstract save(order: Order): Promise<Result<void, RepositoryError>>;
  abstract update(order: Order): Promise<Result<void, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Order, RepositoryError>>;
  abstract findAll(): Promise<Result<Order[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
