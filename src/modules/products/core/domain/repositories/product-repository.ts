import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Product } from '../entities/product';

export abstract class ProductRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Product; expectedVersion: number }, RepositoryError>
  >;
  abstract save(
    product: Product,
    expectedVersion?: number,
  ): Promise<Result<Product, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Product, RepositoryError>>;
  abstract findByIds(
    ids: number[],
  ): Promise<Result<Product[], RepositoryError>>;
  abstract findAll(): Promise<Result<Product[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
