// src/order/infrastructure/postgres-order.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
  ) {}

  async save(order: Order): Promise<Result<void, RepositoryError>> {
    try {
      const entity = this.ormRepo.create({
        id: order.id,
        totalPrice: order.totalPrice,
      });
      await this.ormRepo.save(entity);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save the order`, error);
    }
  }

  async update(order: Order): Promise<Result<void, RepositoryError>> {
    try {
      // Ensure the order exists first
      const existing = await this.ormRepo.findOne({ where: { id: order.id } });
      if (!existing) {
        return ErrorFactory.RepositoryError(
          `Order with ID ${order.id} not found`,
        );
      }

      // Merge new values into the existing entity
      const updated = this.ormRepo.merge(existing, {
        totalPrice: order.totalPrice,
      });

      await this.ormRepo.save(updated);
      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update the order`, error);
    }
  }

  async findById(id: number): Promise<Result<Order, RepositoryError>> {
    try {
      const order = await this.ormRepo.findOne({ where: { id } });
      if (!order) return ErrorFactory.RepositoryError('Order not found');

      return Result.success<Order>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find the order`, error);
    }
  }

  async findAll(): Promise<Result<Order[], RepositoryError>> {
    try {
      const ordersList = await this.ormRepo.find();

      if (ordersList.length <= 0) {
        return ErrorFactory.RepositoryError('Did not find any orders');
      }
      return Result.success<Order[]>(ordersList);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find orders`, error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.ormRepo.delete(id);
      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete the order`, error);
    }
  }
}
