// src/modules/orders/testing/mocks/order-repository.mock.ts
import {
  ListOrdersQuery,
  OrderRepository,
} from '../../core/domain/repositories/order-repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Order } from '../../core/domain/entities/order';
import { OrderStatus } from '../../core/domain/value-objects/order-status';
import { IOrder } from '../../core/domain/interfaces/order.interface';

export class MockOrderRepository implements OrderRepository {
  findByIdForUpdate = jest.fn<
    Promise<
      Result<{ entity: Order; expectedVersion: number }, RepositoryError>
    >,
    [number]
  >();
  save = jest.fn<Promise<Result<Order, RepositoryError>>, [Order, number?]>();
  findById = jest.fn<Promise<Result<Order, RepositoryError>>, [number]>();
  listOrders = jest.fn<
    Promise<Result<Order[], RepositoryError>>,
    [ListOrdersQuery]
  >();
  deleteById = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();
  findByStatusBefore = jest.fn<
    Promise<Result<Order[], RepositoryError>>,
    [OrderStatus, Date]
  >();

  mockSuccessfulFind(orderPrimitives: IOrder): void {
    const domainOrder = Order.fromPrimitives(orderPrimitives);
    this.findById.mockResolvedValue(Result.success(domainOrder));
  }

  mockSuccessfulFindByIdForUpdate(
    orderPrimitives: IOrder,
    expectedVersion = 1,
  ): void {
    const domainOrder = Order.fromPrimitives(orderPrimitives);
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: domainOrder, expectedVersion }),
    );
  }

  mockOrderNotFound(orderId: number): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Order with id ${orderId} not found`)),
    );
    this.findByIdForUpdate.mockResolvedValue(
      Result.failure(new RepositoryError(`Order with id ${orderId} not found`)),
    );
  }

  mockSuccessfulSave(idToAssign = 1001): void {
    this.save.mockImplementation((order) => {
      if (!order.id) {
        order.setId(idToAssign);
      }
      return Promise.resolve(Result.success(order));
    });
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulList(orders: IOrder[]): void {
    const domainOrders = orders.map((order) => {
      return Order.fromPrimitives(order);
    });
    this.listOrders.mockResolvedValue(Result.success(domainOrders));
  }

  mockSuccessfulDelete(): void {
    this.deleteById.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.deleteById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.listOrders).not.toHaveBeenCalled();
    expect(this.deleteById).not.toHaveBeenCalled();
  }
}
