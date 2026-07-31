// src/modules/carts/infrastructure/repositories/postgres-cart-repository/postgres.cart-repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../../../core/domain/entities/cart';
import { CartRepository } from '../../../core/domain/repositories/cart.repository';
import { CartEntity } from '../../orm/cart.schema';
import { CartMapper } from '../../persistence/mappers/cart.mapper';

import { CreateCartInput } from '../../../core/domain/repositories/cart.repository';

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

  async findByuserId(userId: number): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { userId: userId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by user ID',
        error,
      );
    }
  }

  async create(input: CreateCartInput): Promise<Result<Cart, RepositoryError>> {
    try {
      const cart = Cart.createUserCart(input.userId);

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
}
