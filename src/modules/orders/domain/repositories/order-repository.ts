import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { ListOrdersQueryDto } from '../../presentation/dto/list-orders-query.dto';
import { AggregatedOrderInput } from '../factories/order.factory';
import { IOrder } from '../interfaces/IOrder';

export abstract class OrderRepository {
  abstract save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract updateItemsInfo(
    id: string,
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract findById(id: string): Promise<Result<IOrder, RepositoryError>>;
  abstract listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], RepositoryError>>;
  abstract cancelById(id: string): Promise<Result<IOrder, RepositoryError>>;
  abstract deleteById(id: string): Promise<Result<void, RepositoryError>>;
}
