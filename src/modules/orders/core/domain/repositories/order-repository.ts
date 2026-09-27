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
  userId?: number;
  userEmail?: string;
  status?: OrderStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'totalPrice';
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
  minAmount?: number;
  maxAmount?: number;
}

export abstract class OrderRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Order; expectedVersion: number }, RepositoryError>
  >;
  abstract save(
    order: Order,
    expectedVersion?: number,
  ): Promise<Result<Order, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Order, RepositoryError>>;
  abstract listOrders(
    query: ListOrdersQuery,
  ): Promise<Result<Order[], RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
  abstract findByStatusBefore(
    status: OrderStatus,
    before: Date,
  ): Promise<Result<Order[], RepositoryError>>;
}
