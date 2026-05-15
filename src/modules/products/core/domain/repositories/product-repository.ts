import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  price: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  sku?: string;
  price?: number;
}
import { IProduct } from '../interfaces/product.interface';

export abstract class ProductRepository {
  abstract save(
    product: CreateProductInput,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract update(
    id: number,
    product: UpdateProductInput,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract findById(id: number): Promise<Result<IProduct, RepositoryError>>;
  abstract findAll(): Promise<Result<IProduct[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
