import { Order } from '../../domain/entities/order';
import { OrderMutationResult } from '../queries/results/order-mutation.result';

export class OrderMutationMapper {
  static fromDomain(order: Order): OrderMutationResult {
    if (order.id === null) {
      throw new Error('Order mutation result requires a persisted order id');
    }

    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalPrice,
      currency: order.currency,
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
