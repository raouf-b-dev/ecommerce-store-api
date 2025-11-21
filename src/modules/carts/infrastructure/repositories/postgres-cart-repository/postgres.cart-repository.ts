// src/modules/carts/infrastructure/repositories/postgres-cart-repository/postgres.cart-repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Cart } from '../../../domain/entities/cart';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { CartEntity } from '../../orm/cart.schema';
import { CartMapper } from '../../persistence/mappers/cart.mapper';

@Injectable()
export class PostgresCartRepository implements CartRepository {
  constructor(
    @InjectRepository(CartEntity)
    private readonly repository: Repository<CartEntity>,
  ) {}

  async findById(id: string): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find cart', error);
    }
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { customerId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by customer ID',
        error,
      );
    }
  }

  async findBySessionId(
    sessionId: string,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { sessionId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by session ID',
        error,
      );
    }
  }

  async save(cart: Cart): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = CartMapper.toEntity(cart);
      const savedEntity = await this.repository.save(entity);
      return Result.success(CartMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save cart', error);
    }
  }

  async update(cart: Cart): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = CartMapper.toEntity(cart);
      const savedEntity = await this.repository.save(entity);
      return Result.success(CartMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update cart', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        return ErrorFactory.RepositoryError('Cart not found');
      }
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete cart', error);
    }
  }

  async mergeCarts(
    guestCart: Cart,
    userCart: Cart,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const mergeResult = userCart.mergeItems(guestCart.getItems());
      if (mergeResult.isFailure) {
        return Result.failure(
          new RepositoryError(mergeResult.error.message, mergeResult.error),
        );
      }

      const saveResult = await this.save(userCart);
      if (saveResult.isFailure) return saveResult;

      const deleteResult = await this.delete(guestCart.id);
      if (deleteResult.isFailure) return deleteResult;

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to merge carts', error);
    }
  }
}
