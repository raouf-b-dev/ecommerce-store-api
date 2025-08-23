import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import { IOrder } from '../interfaces/IOrder';

export abstract class OrderRepository {
  abstract save(
    createOrderDto: CreateOrderDto,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Result<IOrder, RepositoryError>>;
  abstract findById(id: string): Promise<Result<IOrder, RepositoryError>>;
  abstract findAll(): Promise<Result<IOrder[], RepositoryError>>;
  abstract deleteById(id: string): Promise<Result<void, RepositoryError>>;
}
