import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orm/order.schema';
import { OrderQueryService } from '../../core/application/ports/order-query.service';
import { ListOrdersQuery } from '../../core/application/queries/list-orders.query';
import { OrderListItemDTO } from '../../core/application/queries/results/order-list-item.result';
import { OrderDetailDTO } from '../../core/application/queries/results/order-detail.result';
import { OrderQueryMapper } from '../mappers/query/order-query.mapper';
import { RawOrderListQueryRow } from '../dto/raw-order-list-query-row.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { UserEntity } from '../../../identity/secondary-adapters/orm/user.schema';
import { ProductEntity } from '../../../products/secondary-adapters/orm/product.schema';

/**
 * Cross-Context CQRS Read Adapter — Orders
 *
 * Query-side implementation returning presentation-ready read DTOs directly from persistence.
 * Delegates raw row mapping to OrderQueryMapper.
 *
 * Cross-Context JOIN Rationale:
 * - JOIN orders → users (Identity context): Resolves customer name and email in 1 query.
 * - JOIN order_items → products (Products context): Resolves product SKU and title in 1 query.
 * Read-only projections never mutate foreign contexts and do not instantiate Domain Aggregates.
 */
@Injectable()
export class PostgresOrderQueryAdapter implements OrderQueryService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async list(
    query: ListOrdersQuery,
  ): Promise<Result<PaginatedQueryResult<OrderListItemDTO>, QueryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        authorizedUserId,
        userEmail,
        userName,
        firstName,
        lastName,
        sortBy = 'createdAt',
        sortDirection = 'desc',
      } = query;

      const offset = (page - 1) * limit;

      // Header list query: JOIN orders -> users + aggregate item counts to avoid 1:N pagination duplication
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .leftJoin(UserEntity, 'user', 'user.id = order.userId')
        .leftJoin('order.items', 'item')
        .select([
          'order.id AS "id"',
          'order.userId AS "userId"',
          'order.status AS "status"',
          'order.totalPrice AS "totalAmount"',
          'order.createdAt AS "createdAt"',
          "COALESCE(user.firstName || ' ' || user.lastName, 'Unknown User') AS \"userName\"",
          'COALESCE(user.email, \'\') AS "userEmail"',
          'COUNT(item.id)::int AS "itemCount"',
        ])
        .groupBy('order.id')
        .addGroupBy('user.id');

      if (authorizedUserId) {
        qb.andWhere('order.userId = :authorizedUserId', { authorizedUserId });
      }

      if (status) {
        qb.andWhere('order.status = :status', { status });
      }

      if (userEmail) {
        qb.andWhere('user.email ILIKE :userEmail', {
          userEmail: `%${userEmail}%`,
        });
      }

      if (firstName) {
        qb.andWhere('user.firstName ILIKE :firstName', {
          firstName: `%${firstName}%`,
        });
      }

      if (lastName) {
        qb.andWhere('user.lastName ILIKE :lastName', {
          lastName: `%${lastName}%`,
        });
      }

      if (userName) {
        qb.andWhere(
          '(user.firstName ILIKE :userName OR user.lastName ILIKE :userName)',
          { userName: `%${userName}%` },
        );
      }

      // Total count query for pagination
      const totalCountQb = this.orderRepo.createQueryBuilder('order');
      const needsUserJoin = Boolean(
        userEmail || userName || firstName || lastName,
      );

      if (authorizedUserId) {
        totalCountQb.andWhere('order.userId = :authorizedUserId', {
          authorizedUserId,
        });
      }
      if (status) {
        totalCountQb.andWhere('order.status = :status', { status });
      }

      if (needsUserJoin) {
        totalCountQb.leftJoin(UserEntity, 'user', 'user.id = order.userId');
        if (userEmail) {
          totalCountQb.andWhere('user.email ILIKE :userEmail', {
            userEmail: `%${userEmail}%`,
          });
        }
        if (firstName) {
          totalCountQb.andWhere('user.firstName ILIKE :firstName', {
            firstName: `%${firstName}%`,
          });
        }
        if (lastName) {
          totalCountQb.andWhere('user.lastName ILIKE :lastName', {
            lastName: `%${lastName}%`,
          });
        }
        if (userName) {
          totalCountQb.andWhere(
            '(user.firstName ILIKE :userName OR user.lastName ILIKE :userName)',
            { userName: `%${userName}%` },
          );
        }
      }

      const total = await totalCountQb.getCount();

      const validSortColumns: Record<string, string> = {
        createdAt: 'order.createdAt',
        totalAmount: 'order.totalPrice',
        status: 'order.status',
        id: 'order.id',
      };

      const sortCol =
        validSortColumns[sortBy || 'createdAt'] || 'order.createdAt';
      const rawDirection = sortDirection || query.sortOrder || 'desc';
      const orderDirection =
        rawDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortCol, orderDirection).offset(offset).limit(limit);

      const rawRows: RawOrderListQueryRow[] = await qb.getRawMany();

      const items: OrderListItemDTO[] = rawRows.map((row) =>
        OrderQueryMapper.toListItemDto(row),
      );

      const totalPages = Math.ceil(total / limit) || 1;

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        'Failed to execute order list query',
        error,
      );
    }
  }

  async getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<OrderDetailDTO | null, QueryError>> {
    try {
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.shippingAddress', 'shippingAddress')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoin(UserEntity, 'user', 'user.id = order.userId')
        .addSelect(['user.firstName', 'user.lastName', 'user.email'])
        .where('order.id = :id', { id });

      if (authorizedUserId) {
        qb.andWhere('order.userId = :authorizedUserId', { authorizedUserId });
      }

      const orderEntity = await qb.getOne();
      if (!orderEntity) {
        return ErrorFactory.QueryNotFoundError(`Order with id ${id} not found`);
      }

      // Fetch user detail for presentation projection
      const rawUser = await this.orderRepo.manager
        .createQueryBuilder(UserEntity, 'user')
        .select(['user.firstName', 'user.lastName', 'user.email'])
        .where('user.id = :userId', { userId: orderEntity.userId })
        .getOne();

      // Fetch product SKUs and titles for line items
      const productIds = orderEntity.items
        .map((i: { productId: number }) => i.productId)
        .filter(Boolean);
      let productMap = new Map<number, { sku: string; title: string }>();

      if (productIds.length > 0) {
        const products = await this.orderRepo.manager
          .createQueryBuilder(ProductEntity, 'product')
          .select(['product.id', 'product.sku', 'product.name'])
          .where('product.id IN (:...productIds)', { productIds })
          .getMany();

        productMap = new Map(
          products.map((p) => [
            p.id,
            { sku: p.sku || `SKU-${p.id}`, title: p.name },
          ]),
        );
      }

      const detailDTO = OrderQueryMapper.toDetailDto(
        orderEntity,
        rawUser,
        productMap,
      );

      return Result.success(detailDTO);
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to retrieve order detail for ID ${id}`,
        error,
      );
    }
  }
}
