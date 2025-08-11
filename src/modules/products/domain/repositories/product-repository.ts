import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Product } from '../entities/product';

export abstract class ProductRepository {
  abstract save(product: Product): Promise<Result<void, RepositoryError>>;
  abstract update(product: Product): Promise<Result<void, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Product, RepositoryError>>;
  abstract findAll(): Promise<Result<Product[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
