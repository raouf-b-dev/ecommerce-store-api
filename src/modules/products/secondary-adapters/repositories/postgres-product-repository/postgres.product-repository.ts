// src\modules\products\infrastructure\repositories\PostgresProductRepository\postgres.product-repository.ts
import { HttpStatus } from '@nestjs/common';
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
      if (expectedVersion !== undefined) {
        return await this.updateWithOptimisticLock(product, expectedVersion);
      }
      return await this.saveNormally(product);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError(`Failed to save the product`, error);
    }
  }

  private async updateWithOptimisticLock(
    product: Product,
    expectedVersion: number,
  ): Promise<Result<Product, RepositoryError>> {
    const updateResult = await this.ormRepo
      .createQueryBuilder()
      .update(ProductEntity)
      .set({
        ...ProductMapper.toUpdatePayload(product),
        version: () => 'version + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND version = :expectedVersion', {
        id: product.id,
        expectedVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      return this.resolveOptimisticLockMiss(
        'Product',
        product.id!,
        expectedVersion,
      );
    }

    const updatedEntity = await this.ormRepo.findOneByOrFail({
      id: product.id!,
    });
    return Result.success(ProductMapper.toDomain(updatedEntity));
  }

  private async saveNormally(
    product: Product,
  ): Promise<Result<Product, RepositoryError>> {
    const ormEntity = ProductMapper.toEntity(product);
    const savedOrmEntity = await this.ormRepo.save(ormEntity);
    product.setId(savedOrmEntity.id);
    return Result.success(product);
  }

  private async resolveOptimisticLockMiss(
    name: string,
    id: number,
    expectedVersion: number,
  ): Promise<Result<Product, RepositoryError>> {
    const existing = await this.ormRepo.findOne({ where: { id } });
    if (!existing) {
      return ErrorFactory.RepositoryError(`${name} not found`);
    }
    return ErrorFactory.RepositoryError(
      `Optimistic lock failure for ${name} ${id}. Expected version ${expectedVersion}.`,
      undefined,
      HttpStatus.CONFLICT,
    );
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
