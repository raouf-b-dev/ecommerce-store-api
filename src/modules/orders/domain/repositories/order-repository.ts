import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { ListOrdersQueryDto } from '../../presentation/dto/list-orders-query.dto';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
} from '../factories/order.factory';
import { IOrder } from '../interfaces/IOrder';

export abstract class OrderRepository {
  abstract save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract update(
    id: string,
    updateOrderDto: AggregatedUpdateInput,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract findById(id: string): Promise<Result<IOrder, RepositoryError>>;
  abstract listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], RepositoryError>>;
  abstract cancelById(id: string): Promise<Result<IOrder, RepositoryError>>;
  abstract deleteById(id: string): Promise<Result<void, RepositoryError>>;
}
