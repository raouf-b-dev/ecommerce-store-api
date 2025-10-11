// src/modules/orders/testing/mocks/order-repository.mock.ts
import { OrderRepository } from '../../domain/repositories/order-repository';
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Order } from '../../domain/entities/order';
import { IOrder } from '../../domain/interfaces/order.interface';
import { AggregatedOrderInput } from '../../domain/factories/order.factory';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { ListOrdersQueryDto } from '../../presentation/dto/list-orders-query.dto';

export class MockOrderRepository implements OrderRepository {
  // Jest mock functions
  save = jest.fn<
    Promise<Result<IOrder, RepositoryError>>,
    [AggregatedOrderInput]
  >();
  updateItemsInfo = jest.fn<
    Promise<Result<IOrder, RepositoryError>>,
    [string, CreateOrderItemDto[]]
  >();
  findById = jest.fn<Promise<Result<Order, RepositoryError>>, [string]>();
  listOrders = jest.fn<
    Promise<Result<IOrder[], RepositoryError>>,
    [ListOrdersQueryDto]
  >();
  cancelOrder = jest.fn<Promise<Result<void, RepositoryError>>, [IOrder]>();
  deleteById = jest.fn<Promise<Result<void, RepositoryError>>, [string]>();

  // Helper methods for common test scenarios
  mockSuccessfulFind(orderPrimitives: IOrder): void {
    const domainOrder = Order.fromPrimitives(orderPrimitives);
    this.findById.mockResolvedValue(Result.success(domainOrder));
  }

  mockOrderNotFound(orderId: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Order with id ${orderId} not found`)),
    );
  }

  mockSuccessfulSave(order: IOrder): void {
    this.save.mockResolvedValue(Result.success(order));
  }

  mockSuccessfulCancel(): void {
    this.cancelOrder.mockResolvedValue(Result.success(undefined));
  }

  mockCancelFailure(errorMessage: string): void {
    this.cancelOrder.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulList(orders: IOrder[]): void {
    this.listOrders.mockResolvedValue(Result.success(orders));
  }

  mockSuccessfulDelete(): void {
    this.deleteById.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.deleteById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.updateItemsInfo).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.listOrders).not.toHaveBeenCalled();
    expect(this.cancelOrder).not.toHaveBeenCalled();
    expect(this.deleteById).not.toHaveBeenCalled();
  }
}
