import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/entities/order';
import { OrderRepository } from '../../domain/repositories/order-repository';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Result } from '../../../../core/domain/result';

@Injectable()
export class RedisOrderRepository implements OrderRepository {
  constructor(private readonly postgresRepo: OrderRepository) {}
  async save(order: Order): Promise<Result<void, RepositoryError>> {
    throw new Error('Method not implemented.');
  }
  async update(order: Order): Promise<Result<void, RepositoryError>> {
    throw new Error('Method not implemented.');
  }
  async findById(id: number): Promise<Result<Order, RepositoryError>> {
    try {
      const order = await this.postgresRepo.findById(id);
      if (!order) throw new Error('Order not found');
      return order;
    } catch (error) {
      throw error;
    }
  }
  async findAll(): Promise<Result<Order[], RepositoryError>> {
    throw new Error('Method not implemented.');
  }
  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    throw new Error('Method not implemented.');
  }
}
