// src/modules/orders/application/usecases/process-order/process-order.usecase.spec.ts

import { ProcessOrderUseCase } from './process-order.usecase';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockOrderRepository } from '../../../../testing';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { DomainError } from '../../../../../../shared-kernel/errors/domain.error';

describe('ProcessOrderUseCase', () => {
  let useCase: ProcessOrderUseCase;
  let mockOrderRepo: MockOrderRepository;
  let mockOrder: IOrder;

  beforeEach(() => {
    mockOrderRepo = new MockOrderRepository();
    useCase = new ProcessOrderUseCase(mockOrderRepo);

    mockOrder = OrderTestFactory.createConfirmedOrder();
  });

  it('should successfully process a confirmed order', async () => {
    // Arrange:
    mockOrderRepo.mockSuccessfulFind(mockOrder);
    mockOrderRepo.mockSuccessfulUpdateStatus();

    // Act:
    const result = await useCase.execute(mockOrder.id!);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.status).toBe(OrderStatus.PROCESSING);
    expect(mockOrderRepo.findById).toHaveBeenCalledWith(mockOrder.id!);
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
      mockOrder.id!,
      OrderStatus.PROCESSING,
    );
  });

  it('should return failure if order is not found', async () => {
    // Arrange:
    const orderId = 1;
    mockOrderRepo.mockOrderNotFound(orderId);

    // Act:
    const result = await useCase.execute(orderId);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      `Order with id ${orderId} not found`,
    );
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should return failure if order is not in a processable state (e.g., PENDING)', async () => {
    // Arrange:
    const pendingOrder = OrderTestFactory.createPendingPaymentOrder();
    mockOrderRepo.mockSuccessfulFind(pendingOrder);

    // Act:
    const result = await useCase.execute(pendingOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Order must be confirmed before processing',
      DomainError,
    );
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should return failure if order is already shipped', async () => {
    // Arrange:
    const shippedOrder = OrderTestFactory.createShippedOrder();
    mockOrderRepo.mockSuccessfulFind(shippedOrder);

    // Act:
    const result = await useCase.execute(shippedOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Order must be confirmed before processing',
      DomainError,
    );
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should return failure if updating the status fails', async () => {
    // Arrange:
    mockOrderRepo.mockSuccessfulFind(mockOrder);
    mockOrderRepo.mockUpdateStatusFailure('Database update error');

    // Act:
    const result = await useCase.execute(mockOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(result, 'Database update error');
    expect(mockOrderRepo.findById).toHaveBeenCalledWith(mockOrder.id!);
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
      mockOrder.id!,
      OrderStatus.PROCESSING,
    );
  });

  it('should return failure for an unexpected error', async () => {
    // Arrange:
    const error = new Error('Something exploded');
    mockOrderRepo.findById.mockRejectedValue(error);

    // Act:
    const result = await useCase.execute(1);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Usecase Error',
      UseCaseError,
      error,
    );
  });
});
