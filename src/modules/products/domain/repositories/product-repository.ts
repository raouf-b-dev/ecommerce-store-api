import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateProductDto } from '../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../presentation/dto/update-product.dto';
import { Product } from '../entities/product';

export abstract class ProductRepository {
  abstract save(
    product: CreateProductDto,
  ): Promise<Result<Product, RepositoryError>>;
  abstract update(
    id: number,
    product: UpdateProductDto,
  ): Promise<Result<Product, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Product, RepositoryError>>;
  abstract findAll(): Promise<Result<Product[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
