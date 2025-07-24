import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order-repository';

@Injectable()
export class RedisOrderRepository implements OrderRepository {
  constructor(private readonly postgresRepo: OrderRepository) {}
  async save(order: Order): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async findById(id: number): Promise<Order | null> {
    try {
      const order = await this.postgresRepo.findById(id);
      if (!order) throw new Error('Order not found');
      return order;
    } catch (error) {
      throw error;
    }
  }
  async findAll(): Promise<Order[]> {
    throw new Error('Method not implemented.');
  }
  async deleteById(id: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
