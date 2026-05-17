import { Test, TestingModule } from '@nestjs/testing';
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
import { OrderRepository } from '../../../domain/repositories/order-repository';

describe('ExpirePendingOrdersUseCase', () => {
  let useCase: ExpirePendingOrdersUseCase;
  let mockOrderRepository: MockOrderRepository;
  let mockCancelOrderUseCase: jest.Mocked<CancelOrderUseCase>;

  beforeEach(async () => {
    mockOrderRepository = new MockOrderRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpirePendingOrdersUseCase,
        { provide: OrderRepository, useValue: mockOrderRepository },
        {
          provide: CancelOrderUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<ExpirePendingOrdersUseCase>(
      ExpirePendingOrdersUseCase,
    );
    mockCancelOrderUseCase = module.get(CancelOrderUseCase);
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

    mockOrderRepository.findByStatusBefore.mockResolvedValue(
      Result.success([pendingOrder1, pendingOrder2]),
    );

    mockCancelOrderUseCase.execute.mockResolvedValue(
      Result.success(OrderTestFactory.createCancelledOrder({ id: 1 })),
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
    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledWith({ orderId: 1 });
    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledWith({ orderId: 2 });
  });

  it('should return failure if repository fails to find orders', async () => {
    mockOrderRepository.findByStatusBefore.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

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

    mockOrderRepository.findByStatusBefore.mockResolvedValue(
      Result.success([pendingOrder1, pendingOrder2]),
    );

    // First order fails, second succeeds
    mockCancelOrderUseCase.execute
      .mockResolvedValueOnce(Result.failure(new UseCaseError('Cancel failed')))
      .mockResolvedValueOnce(
        Result.success(OrderTestFactory.createCancelledOrder({ id: 2 })),
      );

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.cancelledCount).toBe(1);
    expect(result.value.failedCount).toBe(1);

    expect(mockCancelOrderUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should return zero counts when no pending orders found', async () => {
    mockOrderRepository.findByStatusBefore.mockResolvedValue(
      Result.success([]),
    );

    const result = await useCase.execute({ expirationMinutes: 30 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.cancelledCount).toBe(0);
    expect(result.value.failedCount).toBe(0);

    expect(mockCancelOrderUseCase.execute).not.toHaveBeenCalled();
  });
});
