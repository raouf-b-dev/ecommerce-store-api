import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CreateProductDto } from '../../../primary-adapters/dto/create-product.dto';
import { UpdateProductDto } from '../../../primary-adapters/dto/update-product.dto';
import { IProduct } from '../interfaces/product.interface';

export abstract class ProductRepository {
  abstract save(
    product: CreateProductDto,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract update(
    id: number,
    product: UpdateProductDto,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract findById(id: number): Promise<Result<IProduct, RepositoryError>>;
  abstract findAll(): Promise<Result<IProduct[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
}
