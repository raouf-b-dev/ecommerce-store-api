// src/order/infrastructure/postgres-order.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
  ) {}

  async save(order: Order): Promise<void> {
    const entity = this.ormRepo.create({
      id: order.id,
      totalPrice: order.totalPrice,
    });
    await this.ormRepo.save(entity);
  }

  async update(order: Order): Promise<void> {
    // Ensure the order exists first
    const existing = await this.ormRepo.findOne({ where: { id: order.id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${order.id} not found`);
    }

    // Merge new values into the existing entity
    const updated = this.ormRepo.merge(existing, {
      totalPrice: order.totalPrice,
    });

    await this.ormRepo.save(updated);
  }

  async findById(id: number): Promise<Order | null> {
    const entity = await this.ormRepo.findOne({ where: { id } });
    if (!entity) return null;

    return new Order({
      id: entity.id,
      totalPrice: Number(entity.totalPrice),
    });
  }

  async findAll(): Promise<Order[]> {
    const entities = await this.ormRepo.find();
    return entities.map(
      (e) =>
        new Order({
          id: e.id,
          totalPrice: Number(e.totalPrice),
        }),
    );
  }

  async deleteById(id: number): Promise<void> {
    await this.ormRepo.delete(id);
  }
}
