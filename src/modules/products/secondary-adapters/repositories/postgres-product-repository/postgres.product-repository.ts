// src\modules\products\infrastructure\repositories\PostgresProductRepository\postgres.product-repository.ts
import { Repository, In } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ProductRepository } from '../../../core/domain/repositories/product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { ProductMapper } from '../../persistence/mappers/product.mapper';
import { Product } from '../../../core/domain/entities/product';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';

export class PostgresProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly ormRepo: Repository<ProductEntity>,
  ) {}

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Product; expectedVersion: number }, RepositoryError>
  > {
    try {
      const ormEntity = await this.ormRepo.findOne({
        where: { id },
      });
      if (!ormEntity) {
        return ErrorFactory.RepositoryError(`Product with ID ${id} not found`);
      }
      return Result.success({
        entity: ProductMapper.toDomain(ormEntity),
        expectedVersion: ormEntity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        `Failed to find product for update`,
        error,
      );
    }
  }

  async save(
    product: Product,
    expectedVersion?: number,
  ): Promise<Result<Product, RepositoryError>> {
    try {
      const ormEntity = ProductMapper.toEntity(product);
      if (expectedVersion !== undefined) {
        ormEntity.version = expectedVersion;
      }
      const savedOrmEntity = await this.ormRepo.save(ormEntity);
      product.setId(savedOrmEntity.id);
      return Result.success(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save the product`, error);
    }
  }

  async findById(id: number): Promise<Result<Product, RepositoryError>> {
    try {
      const ormEntity = await this.ormRepo.findOne({
        where: { id },
      });
      if (!ormEntity) return ErrorFactory.RepositoryError('Product not found');

      return Result.success<Product>(ProductMapper.toDomain(ormEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find the product`, error);
    }
  }

  async findByIds(ids: number[]): Promise<Result<Product[], RepositoryError>> {
    try {
      if (ids.length === 0) return Result.success([]);
      const uniqueIds = [...new Set(ids)];
      const ormEntities = await this.ormRepo.find({
        where: { id: In(uniqueIds) },
      });
      return Result.success(ProductMapper.toDomainArray(ormEntities));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find products by IDs',
        error,
      );
    }
  }

  async findAll(): Promise<Result<Product[], RepositoryError>> {
    try {
      const ormEntities = await this.ormRepo.find();
      return Result.success<Product[]>(
        ProductMapper.toDomainArray(ormEntities),
      );
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find products`, error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.ormRepo.delete(id);
      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        `Failed to delete the product`,
        error,
      );
    }
  }
}
