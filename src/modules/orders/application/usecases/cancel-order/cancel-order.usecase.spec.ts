import { CancelOrderUseCase } from './cancel-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { OrderBuilder } from '../../../testing/builders/order.builder';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('CancelOrderUseCase', () => {
  let useCase: CancelOrderUseCase;
  let mockRepository: MockOrderRepository;

  beforeEach(() => {
    mockRepository = new MockOrderRepository();
    useCase = new CancelOrderUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('should cancel the order and return its data on success', async () => {
    const orderId = 'OR0000001';
    const cancellableOrder = OrderTestFactory.createCancellableOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFind(cancellableOrder as any);
    mockRepository.mockSuccessfulCancel();

    const result = await useCase.execute(orderId);

    expect(mockRepository.findById).toHaveBeenCalledWith(orderId);
    expect(mockRepository.cancelOrder).toHaveBeenCalled();
    ResultAssertionHelper.assertResultSuccess(result);
    if (result.isSuccess) {
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('should return a failure result if the order is not found', async () => {
    const orderId = 'OR0000001';
    mockRepository.mockOrderNotFound(orderId);

    const result = await useCase.execute(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order with id OR0000001 not found',
      RepositoryError,
    );

    expect(mockRepository.cancelOrder).not.toHaveBeenCalled();
  });

  it('should return a failure result if the order is not in a cancellable state', async () => {
    const orderId = 'OR0000001';
    const nonCancellableOrder = OrderTestFactory.createNonCancellableOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFind(nonCancellableOrder as any);

    const result = await useCase.execute(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order is not in a cancellable state',
      UseCaseError,
    );

    expect(mockRepository.cancelOrder).not.toHaveBeenCalled();
  });

  it('should return a failure result if the repository fails to save the cancellation', async () => {
    const orderId = 'OR0000001';
    const cancellableOrder = OrderTestFactory.createCancellableOrder({
      id: orderId,
    });

    mockRepository.mockSuccessfulFind(cancellableOrder as any);
    mockRepository.mockCancelFailure('DB write failed');

    const result = await useCase.execute(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'DB write failed',
      RepositoryError,
    );
  });

  it('should return a failure result on an unexpected error', async () => {
    const orderId = 'OR0000001';
    const errorCause = new Error('Database connection lost');

    mockRepository.findById.mockRejectedValue(errorCause);

    const result = await useCase.execute(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Usecase Erro',
      UseCaseError,
      errorCause,
    );
  });

  describe('complex scenarios', () => {
    it('should cancel multi-item order successfully', async () => {
      const orderPrimitives = new OrderBuilder()
        .withId('OR0000001')
        .withItems(5)
        .asCancellable()
        .build();

      mockRepository.mockSuccessfulFind(orderPrimitives);
      mockRepository.mockSuccessfulCancel();

      const result = await useCase.execute(orderPrimitives.id);

      // Test the outcome
      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.status).toBe(OrderStatus.CANCELLED);
        expect(result.value.id).toBe('OR0000001');
      }
      expect(mockRepository.findById).toHaveBeenCalledWith('OR0000001');
      expect(mockRepository.cancelOrder).toHaveBeenCalledTimes(1);

      const passedPrimitives = mockRepository.cancelOrder.mock.calls[0][0];
      expect(passedPrimitives.status).toBe(OrderStatus.CANCELLED);
    });

    it('should not cancel shipped order', async () => {
      const order = new OrderBuilder()
        .withId('OR0000001')
        .asNonCancellable()
        .build();

      mockRepository.mockSuccessfulFind(order);

      const result = await useCase.execute(order.id);

      ResultAssertionHelper.assertResultFailure(result);

      expect(mockRepository.cancelOrder).not.toHaveBeenCalled();
    });
  });
});
