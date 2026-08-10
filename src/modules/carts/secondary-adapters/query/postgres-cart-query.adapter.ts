import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartQueryService } from '../../core/application/ports/cart-query.service';
import { CartPresentationDTO } from '../../core/application/queries/results/cart-presentation.result';
import { CartEntity } from '../orm/cart.schema';
import { CartItemEntity } from '../orm/cart-item.schema';
import { RawCartQueryRow } from '../dto/raw-cart-query-row.interface';
import { CartQueryMapper } from '../mappers/query/cart-query.mapper';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresCartQueryAdapter implements CartQueryService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
  ) {}

  async getById(
    cartId: number,
    authorizedUserId?: number,
  ): Promise<Result<CartPresentationDTO | null, QueryError>> {
    try {
      const qb = this.cartRepo
        .createQueryBuilder('cart')
        .leftJoin(CartItemEntity, 'item', 'item.cartId = cart.id')
        .select([
          'cart.id AS "cartId"',
          'cart.userId AS "userId"',
          'cart.updatedAt AS "cartUpdatedAt"',
          'item.id AS "itemId"',
          'item.productId AS "productId"',
          'item.productName AS "productName"',
          'item.price AS "price"',
          'item.quantity AS "quantity"',
          'item.imageUrl AS "imageUrl"',
        ])
        .where('cart.id = :cartId', { cartId });

      if (authorizedUserId) {
        qb.andWhere('cart.userId = :authorizedUserId', { authorizedUserId });
      }

      const rawRows: RawCartQueryRow[] = await qb.getRawMany();
      const result = CartQueryMapper.toPresentationDto(rawRows);
      return Result.success(result);
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch cart for ID ${cartId}: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getByUserId(
    userId: number,
    authorizedUserId?: number,
  ): Promise<Result<CartPresentationDTO | null, QueryError>> {
    try {
      const qb = this.cartRepo
        .createQueryBuilder('cart')
        .leftJoin(CartItemEntity, 'item', 'item.cartId = cart.id')
        .select([
          'cart.id AS "cartId"',
          'cart.userId AS "userId"',
          'cart.updatedAt AS "cartUpdatedAt"',
          'item.id AS "itemId"',
          'item.productId AS "productId"',
          'item.productName AS "productName"',
          'item.price AS "price"',
          'item.quantity AS "quantity"',
          'item.imageUrl AS "imageUrl"',
        ])
        .where('cart.userId = :userId', { userId });

      if (authorizedUserId) {
        qb.andWhere('cart.userId = :authorizedUserId', { authorizedUserId });
      }

      const rawRows: RawCartQueryRow[] = await qb.getRawMany();
      const result = CartQueryMapper.toPresentationDto(rawRows);
      return Result.success(result);
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch cart for user ID ${userId}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
