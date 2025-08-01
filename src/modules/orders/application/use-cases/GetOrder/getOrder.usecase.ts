// src/modules/orders/application/usecases/GetOrder/get-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';

@Injectable()
export class GetOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}
  async execute(id: number): Promise<Order> {
    try {
      const order = await this.orderRepository.findById(id);
      if (!order) throw new Error(`Order with id ${id} not found`);
      return order;
    } catch (error) {
      throw error;
    }
  }
}
