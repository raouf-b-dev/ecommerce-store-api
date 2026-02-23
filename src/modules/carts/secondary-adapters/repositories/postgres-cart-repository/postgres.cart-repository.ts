// src/modules/carts/infrastructure/repositories/postgres-cart-repository/postgres.cart-repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { Cart } from '../../../core/domain/entities/cart';
import { CartRepository } from '../../../core/domain/repositories/cart.repository';
import { CartEntity } from '../../orm/cart.schema';
import { CartMapper } from '../../persistence/mappers/cart.mapper';

import { CreateCartDto } from '../../../primary-adapters/dto/create-cart.dto';

@Injectable()
export class PostgresCartRepository implements CartRepository {
  constructor(
    @InjectRepository(CartEntity)
    private readonly repository: Repository<CartEntity>,
  ) {}

  async findById(id: number): Promise<Result<Cart, RepositoryError>> {
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
    customerId: number,
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
    sessionId: number,
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

  async create(dto: CreateCartDto): Promise<Result<Cart, RepositoryError>> {
    try {
      let cart: Cart;

      if (dto.customerId) {
        cart = Cart.createUserCart(dto.customerId);
      } else {
        if (!dto.sessionId) {
          return ErrorFactory.RepositoryError(
            'Session ID required for guest cart',
          );
        }
        cart = Cart.createGuestCart(dto.sessionId);
      }

      const entity = CartMapper.toEntity(cart);
      const savedEntity = await this.repository.save(entity);
      return Result.success(CartMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to create cart', error);
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

  async delete(id: number): Promise<Result<void, RepositoryError>> {
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

      const saveResult = await this.update(userCart);
      if (saveResult.isFailure) return saveResult;

      if (guestCart.id) {
        const deleteResult = await this.delete(guestCart.id);
        if (deleteResult.isFailure) return deleteResult;
      }

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to merge carts', error);
    }
  }
}
