import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductQueryService } from '../../core/application/ports/product-query.service';
import { ListProductsQuery } from '../../core/application/queries/list-products.query';
import { ProductListItemDTO } from '../../core/application/queries/results/product-list-item.result';
import { ProductDetailDTO } from '../../core/application/queries/results/product-detail.result';
import { ProductEntity } from '../orm/product.schema';
import { RawProductListQueryRow } from '../dto/raw-product-list-query-row.interface';
import { ProductQueryMapper } from '../mappers/query/product-query.mapper';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresProductQueryAdapter implements ProductQueryService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  async list(
    query: ListProductsQuery,
  ): Promise<Result<PaginatedQueryResult<ProductListItemDTO>, QueryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        categoryId,
        search,
        isActive,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const offset = (page - 1) * limit;

      const qb = this.productRepo
        .createQueryBuilder('product')
        .select([
          'product.id AS "id"',
          'product.name AS "name"',
          'product.slug AS "slug"',
          'product.sku AS "sku"',
          'product.price AS "price"',
          'product.currency AS "currency"',
          'product.imageUrl AS "imageUrl"',
          'product.categoryId AS "categoryId"',
          'product.isActive AS "isActive"',
          'product.createdAt AS "createdAt"',
        ]);

      if (isActive !== undefined) {
        qb.andWhere('product.isActive = :isActive', { isActive });
      }

      if (categoryId) {
        qb.andWhere('product.categoryId = :categoryId', { categoryId });
      }

      if (search) {
        qb.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (minPrice !== undefined) {
        qb.andWhere('product.price >= :minPrice', { minPrice });
      }

      if (maxPrice !== undefined) {
        qb.andWhere('product.price <= :maxPrice', { maxPrice });
      }

      const totalCountQb = this.productRepo.createQueryBuilder('product');
      if (isActive !== undefined) {
        totalCountQb.andWhere('product.isActive = :isActive', { isActive });
      }
      if (categoryId) {
        totalCountQb.andWhere('product.categoryId = :categoryId', {
          categoryId,
        });
      }
      if (search) {
        totalCountQb.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
          { search: `%${search}%` },
        );
      }
      if (minPrice !== undefined) {
        totalCountQb.andWhere('product.price >= :minPrice', { minPrice });
      }
      if (maxPrice !== undefined) {
        totalCountQb.andWhere('product.price <= :maxPrice', { maxPrice });
      }

      const total = await totalCountQb.getCount();

      const validSortColumns: Record<string, string> = {
        createdAt: 'product.createdAt',
        price: 'product.price',
        name: 'product.name',
        id: 'product.id',
      };

      const sortCol =
        validSortColumns[sortBy || 'createdAt'] || 'product.createdAt';
      const orderDir =
        (sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortCol, orderDir).offset(offset).limit(limit);

      const rawRows: RawProductListQueryRow[] = await qb.getRawMany();
      const items = rawRows.map((row) => ProductQueryMapper.toListItemDto(row));

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch product list: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getById(
    id: number,
  ): Promise<Result<ProductDetailDTO | null, QueryError>> {
    try {
      const qb = this.productRepo
        .createQueryBuilder('product')
        .select([
          'product.id AS "id"',
          'product.name AS "name"',
          'product.slug AS "slug"',
          'product.description AS "description"',
          'product.sku AS "sku"',
          'product.price AS "price"',
          'product.currency AS "currency"',
          'product.imageUrl AS "imageUrl"',
          'product.categoryId AS "categoryId"',
          'product.isActive AS "isActive"',
          'product.createdAt AS "createdAt"',
          'product.updatedAt AS "updatedAt"',
        ])
        .where('product.id = :id', { id });

      const rawRow: RawProductListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(ProductQueryMapper.toDetailDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch product details for ID ${id}: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getBySlug(
    slug: string,
  ): Promise<Result<ProductDetailDTO | null, QueryError>> {
    try {
      const qb = this.productRepo
        .createQueryBuilder('product')
        .select([
          'product.id AS "id"',
          'product.name AS "name"',
          'product.slug AS "slug"',
          'product.description AS "description"',
          'product.sku AS "sku"',
          'product.price AS "price"',
          'product.currency AS "currency"',
          'product.imageUrl AS "imageUrl"',
          'product.categoryId AS "categoryId"',
          'product.isActive AS "isActive"',
          'product.createdAt AS "createdAt"',
          'product.updatedAt AS "updatedAt"',
        ])
        .where('product.slug = :slug', { slug });

      const rawRow: RawProductListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(ProductQueryMapper.toDetailDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch product details for slug ${slug}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
