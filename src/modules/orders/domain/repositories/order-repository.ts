import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { ListOrdersQueryDto } from '../../presentation/dto/list-orders-query.dto';
import { Order } from '../entities/order';
import { AggregatedOrderInput } from '../factories/order.factory';
import { OrderStatus } from '../value-objects/order-status';

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
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<Order, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Order, RepositoryError>>;
  abstract listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
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
