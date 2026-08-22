// src/modules/orders/application/usecases/process-order/process-order.usecase.spec.ts

import { OrderTestFactory } from 'src/modules/orders/testing';
import { ProcessOrderUseCase } from './process-order.usecase';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockOrderRepository } from '../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

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
    mockOrderRepo.mockSuccessfulFindByIdForUpdate(mockOrder);
    mockOrderRepo.mockSuccessfulSave();

    // Act:
    const result = await useCase.execute(mockOrder.id!);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.status).toBe(OrderStatus.PROCESSING);
    expect(mockOrderRepo.findByIdForUpdate).toHaveBeenCalledWith(mockOrder.id!);
    expect(mockOrderRepo.save).toHaveBeenCalled();
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
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it('should return failure if order is not in a processable state (e.g., PENDING)', async () => {
    // Arrange:
    const pendingOrder = OrderTestFactory.createPendingPaymentOrder();
    mockOrderRepo.mockSuccessfulFindByIdForUpdate(pendingOrder);

    // Act:
    const result = await useCase.execute(pendingOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Order must be confirmed before processing',
      DomainError,
    );
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it('should return failure if order is already shipped', async () => {
    // Arrange:
    const shippedOrder = OrderTestFactory.createShippedOrder();
    mockOrderRepo.mockSuccessfulFindByIdForUpdate(shippedOrder);

    // Act:
    const result = await useCase.execute(shippedOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Order must be confirmed before processing',
      DomainError,
    );
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it('should return failure if saving the order fails', async () => {
    // Arrange:
    mockOrderRepo.mockSuccessfulFindByIdForUpdate(mockOrder);
    mockOrderRepo.mockSaveFailure('Database update error');

    // Act:
    const result = await useCase.execute(mockOrder.id!);

    // Assert:
    ResultAssertionHelper.assertResultFailure(result, 'Database update error');
    expect(mockOrderRepo.findByIdForUpdate).toHaveBeenCalledWith(mockOrder.id!);
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });
});
