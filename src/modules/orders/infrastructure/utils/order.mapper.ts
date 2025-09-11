import { IOrder } from '../../domain/interfaces/IOrder';
import { OrderForCache } from './order.type';

export class OrderMapper {
  public static toCache(order: IOrder): OrderForCache {
    return {
      ...order,
      createdAt: order.createdAt.getTime(),
      updatedAt: order.updatedAt ? order.updatedAt.getTime() : null,
    };
  }

  public static fromCache(cachedOrder: OrderForCache): IOrder {
    return {
      ...cachedOrder,
      createdAt: new Date(cachedOrder.createdAt),
      updatedAt: cachedOrder.updatedAt
        ? new Date(cachedOrder.updatedAt)
        : undefined,
    };
  }
}
