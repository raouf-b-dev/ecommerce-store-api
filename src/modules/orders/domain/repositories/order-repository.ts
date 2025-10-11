import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { ListOrdersQueryDto } from '../../presentation/dto/list-orders-query.dto';
import { Order } from '../entities/order';
import { AggregatedOrderInput } from '../factories/order.factory';
import { IOrder } from '../interfaces/order.interface';

export abstract class OrderRepository {
  abstract save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract updateItemsInfo(
    id: string,
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract findById(id: string): Promise<Result<Order, RepositoryError>>;
  abstract listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], RepositoryError>>;
  abstract cancelOrder(
    orderPrimitives: IOrder,
  ): Promise<Result<void, RepositoryError>>;
  abstract deleteById(id: string): Promise<Result<void, RepositoryError>>;
}
