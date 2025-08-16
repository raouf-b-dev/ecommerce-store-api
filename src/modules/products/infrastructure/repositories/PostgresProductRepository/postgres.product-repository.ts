// src\modules\products\infrastructure\repositories\PostgresProductRepository\postgres.product-repository.ts
import { Repository } from 'typeorm';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Product } from '../../../domain/entities/product';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

export class PostgresProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly ormRepo: Repository<ProductEntity>,
  ) {}
  async save(
    createProductDto: CreateProductDto,
  ): Promise<Result<Product, RepositoryError>> {
    try {
      const entity = this.ormRepo.create({
        ...createProductDto,
        createdAt: new Date(),
      });
      await this.ormRepo.save(entity);

      return Result.success<Product>(entity);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save the product`, error);
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Result<Product, RepositoryError>> {
    try {
      // Ensure the product exists first
      const existing = await this.ormRepo.findOne({
        where: { id },
      });
      if (!existing) {
        return ErrorFactory.RepositoryError(`Product with ID ${id} not found`);
      }

      // Merge new values into the existing entity
      const updatedProduct = this.ormRepo.merge(existing, {
        ...updateProductDto,
        updatedAt: new Date(),
      });

      await this.ormRepo.save(updatedProduct);
      return Result.success<Product>(updatedProduct);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        `Failed to update the product`,
        error,
      );
    }
  }
  async findById(id: number): Promise<Result<Product, RepositoryError>> {
    try {
      const product = await this.ormRepo.findOne({ where: { id } });
      if (!product) return ErrorFactory.RepositoryError('Product not found');

      return Result.success<Product>(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find the product`, error);
    }
  }
  async findAll(): Promise<Result<Product[], RepositoryError>> {
    try {
      const productsList = await this.ormRepo.find();

      if (productsList.length <= 0) {
        return ErrorFactory.RepositoryError('Did not find any products');
      }
      return Result.success<Product[]>(productsList);
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
