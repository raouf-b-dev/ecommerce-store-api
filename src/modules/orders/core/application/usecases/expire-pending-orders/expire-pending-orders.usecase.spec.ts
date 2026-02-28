import { ExpirePendingOrdersUseCase } from './expire-pending-orders.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ResultAssertionHelper } from '../../../../../../testing';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { Order } from '../../../domain/entities/order';
import { CancelOrderUseCase } from '../cancel-order/cancel-order.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('ExpirePendingOrdersUseCase', () => {
  let useCase: ExpirePendingOrdersUseCase;
  let mockOrderRepository: MockOrderRepository;
  let mockCancelOrderUseCase: jest.Mocked<CancelOrderUseCase>;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    mockCancelOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CancelOrderUseCase>;
    useCase = new ExpirePendingOrdersUseCase(
      mockOrderRepository,
      mockCancelOrderUseCase,
    );
  });

  afterEach(() => {
    mockOrderRepository.reset();
    jest.clearAllMocks();
  });

  it('should expire pending orders older than the threshold', async () => {
    const pendingOrder1 = Order.fromPrimitives(
      OrderTestFactory.createPendingPaymentOrder({ id: 1 }),
    );
    const pendingOrder2 = Order.fromPrimitives(
      OrderTestFactory.createPendingPaymentOrder({ id: 2 }),
    );

    mockOrderRepository.findByStatusBefore.mockResolvedValue({
      isFailure: false,
      isSuccess: true,
      value: [pendingOrder1, pendingOrder2],
      error: undefined,
    } as any);

    mockCancelOrderUseCase.execute.mockResolvedValue(
      Result.success({ id: 1, status: OrderStatus.CANCELLED } as any),
    );

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.cancelledCount).toBe(2);
    expect(result.value.failedCount).toBe(0);

    expect(mockOrderRepository.findByStatusBefore).toHaveBeenCalledWith(
      OrderStatus.PENDING_PAYMENT,
      expect.any(Date),
    );

    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledWith(1);
    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledWith(2);
  });

  it('should return failure if repository fails to find orders', async () => {
    mockOrderRepository.findByStatusBefore.mockResolvedValue({
      isFailure: true,
      isSuccess: false,
      error: new RepositoryError('DB Error'),
      value: undefined,
    } as any);

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to fetch pending orders',
    );

    expect(mockCancelOrderUseCase.execute).not.toHaveBeenCalled();
  });

  it('should continue processing other orders if one fails to cancel', async () => {
    const pendingOrder1 = Order.fromPrimitives(
      OrderTestFactory.createPendingPaymentOrder({ id: 1 }),
    );
    const pendingOrder2 = Order.fromPrimitives(
      OrderTestFactory.createPendingPaymentOrder({ id: 2 }),
    );

    mockOrderRepository.findByStatusBefore.mockResolvedValue({
      isFailure: false,
      isSuccess: true,
      value: [pendingOrder1, pendingOrder2],
      error: undefined,
    } as any);

    // First order fails, second succeeds
    mockCancelOrderUseCase.execute
      .mockResolvedValueOnce(Result.failure(new UseCaseError('Cancel failed')))
      .mockResolvedValueOnce(
        Result.success({ id: 2, status: OrderStatus.CANCELLED } as any),
      );

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.cancelledCount).toBe(1);
    expect(result.value.failedCount).toBe(1);

    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should return zero counts when no pending orders found', async () => {
    mockOrderRepository.findByStatusBefore.mockResolvedValue({
      isFailure: false,
      isSuccess: true,
      value: [],
      error: undefined,
    } as any);

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.cancelledCount).toBe(0);
    expect(result.value.failedCount).toBe(0);

    expect(mockCancelOrderUseCase.execute).not.toHaveBeenCalled();
  });
});
