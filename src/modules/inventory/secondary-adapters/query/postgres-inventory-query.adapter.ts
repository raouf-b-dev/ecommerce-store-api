import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryQueryService } from '../../core/application/ports/inventory-query.service';
import { ListInventoryQuery } from '../../core/application/queries/list-inventory.query';
import { InventoryListItemDTO } from '../../core/application/queries/results/inventory-list-item.result';
import { InventoryEntity } from '../orm/inventory.schema';
import { ProductEntity } from '../../../products/secondary-adapters/orm/product.schema';
import { RawInventoryListQueryRow } from '../dto/raw-inventory-list-query-row.interface';
import { InventoryQueryMapper } from '../mappers/query/inventory-query.mapper';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresInventoryQueryAdapter implements InventoryQueryService {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
  ) {}

  async list(
    query: ListInventoryQuery,
  ): Promise<Result<PaginatedQueryResult<InventoryListItemDTO>, QueryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        productId,
        sku,
        productTitle,
        lowStockOnly,
        sortBy = 'updatedAt',
        sortDirection = 'desc',
        sortOrder,
      } = query;

      const offset = (page - 1) * limit;

      // Cross-context read projection: JOIN inventory -> products
      const qb = this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoin(ProductEntity, 'product', 'product.id = inventory.productId')
        .select([
          'inventory.id AS "id"',
          'inventory.productId AS "productId"',
          'product.sku AS "sku"',
          'product.name AS "productTitle"',
          'inventory.availableQuantity AS "availableQuantity"',
          'inventory.reservedQuantity AS "reservedQuantity"',
          '(inventory.availableQuantity + inventory.reservedQuantity) AS "totalQuantity"',
          'inventory.updatedAt AS "updatedAt"',
        ]);

      if (productId) {
        qb.andWhere('inventory.productId = :productId', { productId });
      }

      if (sku) {
        qb.andWhere('product.sku ILIKE :sku', { sku: `%${sku}%` });
      }

      if (productTitle) {
        qb.andWhere('product.name ILIKE :productTitle', {
          productTitle: `%${productTitle}%`,
        });
      }

      if (lowStockOnly) {
        qb.andWhere(
          'inventory.availableQuantity <= inventory.lowStockThreshold',
        );
      }

      // Total count query for pagination
      const totalCountQb = this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoin(ProductEntity, 'product', 'product.id = inventory.productId');

      if (productId) {
        totalCountQb.andWhere('inventory.productId = :productId', {
          productId,
        });
      }

      if (sku) {
        totalCountQb.andWhere('product.sku ILIKE :sku', { sku: `%${sku}%` });
      }

      if (productTitle) {
        totalCountQb.andWhere('product.name ILIKE :productTitle', {
          productTitle: `%${productTitle}%`,
        });
      }

      if (lowStockOnly) {
        totalCountQb.andWhere(
          'inventory.availableQuantity <= inventory.lowStockThreshold',
        );
      }

      const total = await totalCountQb.getCount();

      const validSortColumns: Record<string, string> = {
        updatedAt: 'inventory.updatedAt',
        availableQuantity: 'inventory.availableQuantity',
        totalQuantity: 'inventory.availableQuantity',
        productId: 'inventory.productId',
      };

      const sortCol =
        validSortColumns[sortBy || 'updatedAt'] || 'inventory.updatedAt';
      const rawDir = sortDirection || sortOrder || 'desc';
      const orderDir = rawDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortCol, orderDir).offset(offset).limit(limit);

      const rawRows: RawInventoryListQueryRow[] = await qb.getRawMany();
      const items = rawRows.map((row) =>
        InventoryQueryMapper.toListItemDto(row),
      );

      const totalPages = Math.ceil(total / limit);

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch inventory list: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getByProductId(
    productId: number,
  ): Promise<Result<InventoryListItemDTO | null, QueryError>> {
    try {
      const qb = this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoin(ProductEntity, 'product', 'product.id = inventory.productId')
        .select([
          'inventory.id AS "id"',
          'inventory.productId AS "productId"',
          'product.sku AS "sku"',
          'product.name AS "productTitle"',
          'inventory.availableQuantity AS "availableQuantity"',
          'inventory.reservedQuantity AS "reservedQuantity"',
          '(inventory.availableQuantity + inventory.reservedQuantity) AS "totalQuantity"',
          'inventory.updatedAt AS "updatedAt"',
        ])
        .where('inventory.productId = :productId', { productId });

      const rawRow: RawInventoryListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(InventoryQueryMapper.toListItemDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch inventory for product ID ${productId}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
