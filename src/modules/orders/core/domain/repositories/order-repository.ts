import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Order } from '../entities/order';
import { OrderStatus } from '../value-objects/order-status';
export interface OrderItemInput {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface ListOrdersQuery {
  page?: number;
  limit?: number;
  customerId?: number;
  customerEmail?: string;
  status?: OrderStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'totalPrice';
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
  minAmount?: number;
  maxAmount?: number;
}

export abstract class OrderRepository {
  abstract save(order: Order): Promise<Result<Order, RepositoryError>>;
  abstract updateStatus(
    id: number,
    status: OrderStatus,
  ): Promise<Result<void, RepositoryError>>;
  abstract updatePaymentId(
    orderId: number,
    paymentId: number,
  ): Promise<Result<void, RepositoryError>>;
  abstract updateItemsInfo(
    id: number,
    updateOrderItemDto: OrderItemInput[],
  ): Promise<Result<Order, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Order, RepositoryError>>;
  abstract listOrders(
    query: ListOrdersQuery,
  ): Promise<Result<Order[], RepositoryError>>;
  abstract cancelOrder(
    orderPrimitives: Order,
  ): Promise<Result<void, RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
  abstract findByStatusBefore(
    status: OrderStatus,
    before: Date,
  ): Promise<Result<Order[], RepositoryError>>;
}
