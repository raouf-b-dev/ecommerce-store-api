import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryQueryService } from '../../core/application/ports/category-query.service';
import { ListCategoriesQuery } from '../../core/application/queries/list-categories.query';
import { CategoryResult } from '../../core/application/queries/results/category.result';
import { CategoryEntity } from '../orm/category.schema';
import { ProductEntity } from '../orm/product.schema';
import { RawCategoryQueryRow } from '../dto/raw-category-query-row.interface';
import { CategoryQueryMapper } from '../mappers/query/category-query.mapper';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresCategoryQueryAdapter implements CategoryQueryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  async list(
    query: ListCategoriesQuery = {},
  ): Promise<Result<CategoryResult[], QueryError>> {
    try {
      const qb = this.createBaseQuery();

      if (query.isActive !== undefined) {
        qb.andWhere('category.isActive = :isActive', {
          isActive: query.isActive,
        });
      }

      qb.orderBy('category.id', 'ASC');

      const rows = await qb.getRawMany<RawCategoryQueryRow>();
      return Result.success(rows.map((row) => CategoryQueryMapper.toResult(row)));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to list categories';
      return ErrorFactory.QueryError(message);
    }
  }

  async getById(
    id: number,
  ): Promise<Result<CategoryResult | null, QueryError>> {
    try {
      const row = await this.createBaseQuery()
        .andWhere('category.id = :id', { id })
        .getRawOne<RawCategoryQueryRow>();

      if (!row) {
        return Result.success(null);
      }

      return Result.success(CategoryQueryMapper.toResult(row));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to get category';
      return ErrorFactory.QueryError(message);
    }
  }

  /**
   * Active-product count is applied in the JOIN ON clause so empty categories
   * still return productCount = 0 (LEFT JOIN must not become an INNER JOIN).
   */
  private createBaseQuery() {
    return this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin(
        ProductEntity,
        'product',
        'product.categoryId = category.id AND product.isActive = true',
      )
      .select([
        'category.id AS "id"',
        'category.name AS "name"',
        'category.slug AS "slug"',
        'category.description AS "description"',
        'category.isActive AS "isActive"',
        'COUNT(product.id) AS "productCount"',
      ])
      .groupBy('category.id')
      .addGroupBy('category.name')
      .addGroupBy('category.slug')
      .addGroupBy('category.description')
      .addGroupBy('category.isActive');
  }
}
