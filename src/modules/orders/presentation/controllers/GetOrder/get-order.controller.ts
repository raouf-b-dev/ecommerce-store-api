import { Injectable } from '@nestjs/common';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrder/getOrder.usecase';
import { Order } from '../../../domain/entities/order';

@Injectable()
export class GetOrderController {
  constructor(private getOrderUseCase: GetOrderUseCase) {}
  async handle(id: number): Promise<Order> {
    try {
      const order = await this.getOrderUseCase.execute(id);
      return order;
    } catch (error) {
      throw error;
    }
  }
}
