import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateProductDto } from '../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../presentation/dto/update-product.dto';
import { IProduct } from '../interfaces/IProduct';

export abstract class ProductRepository {
  abstract save(
    product: CreateProductDto,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract update(
    id: string,
    product: UpdateProductDto,
  ): Promise<Result<IProduct, RepositoryError>>;
  abstract findById(id: string): Promise<Result<IProduct, RepositoryError>>;
  abstract findAll(): Promise<Result<IProduct[], RepositoryError>>;
  abstract deleteById(id: string): Promise<Result<void, RepositoryError>>;
}
