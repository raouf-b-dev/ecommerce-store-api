// cancel-order.controller.spec.ts
import { CancelOrderController } from './cancel-order.controller';
import { CancelOrderUseCase } from '../../../application/usecases/cancel-order/cancel-order.usecase';
import { Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMethodType } from '../../../../payments/domain';

describe('CancelOrderController', () => {
  let controller: CancelOrderController;
  let mockUseCase: jest.Mocked<CancelOrderUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    } as any;

    controller = new CancelOrderController(mockUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return success result when use case succeeds', async () => {
    const orderId = 'OR0000001';
    const cancelledOrder = OrderTestFactory.createCancelledOrder({
      id: orderId,
    });

    mockUseCase.execute.mockResolvedValue(Result.success(cancelledOrder));

    const result = await controller.handle(orderId);

    expect(mockUseCase.execute).toHaveBeenCalledWith(orderId);
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    ResultAssertionHelper.assertResultSuccess(result);
    if (result.isSuccess) {
      expect(result.value).toEqual(cancelledOrder);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('should cancel pending order successfully', async () => {
    const orderId = 'OR0000001';
    const cancelledOrder = OrderTestFactory.createCancelledOrder({
      id: orderId,
    });

    mockUseCase.execute.mockResolvedValue(Result.success(cancelledOrder));

    const result = await controller.handle(orderId);

    ResultAssertionHelper.assertResultSuccess(result);
    if (result.isSuccess) {
      expect(result.value.id).toBe(orderId);
      expect(result.value.status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('should return failure result when use case fails', async () => {
    const orderId = 'OR0000001';
    const useCaseError = new UseCaseError('Order cannot be cancelled');

    mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

    const result = await controller.handle(orderId);

    expect(mockUseCase.execute).toHaveBeenCalledWith(orderId);
    ResultAssertionHelper.assertResultFailure(
      result,
      'Order cannot be cancelled',
      UseCaseError,
    );
  });

  it('should return failure when order not found', async () => {
    const orderId = 'OR9999999';
    const useCaseError = new UseCaseError(`Order with id ${orderId} not found`);

    mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

    const result = await controller.handle(orderId);

    ResultAssertionHelper.assertResultFailure(result, 'not found');
  });

  it('should return failure when order is not cancellable', async () => {
    const orderId = 'OR0000001';
    const useCaseError = new UseCaseError(
      'Order is not in a cancellable state',
    );

    mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

    const result = await controller.handle(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order is not in a cancellable state',
    );
  });

  it('should catch unexpected errors and wrap in ControllerError', async () => {
    const orderId = 'OR0000001';
    const unexpectedError = new Error('Unexpected database error');

    mockUseCase.execute.mockRejectedValue(unexpectedError);

    const result = await controller.handle(orderId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      unexpectedError,
    );
  });

  describe('edge cases', () => {
    it('should handle empty order ID', async () => {
      const emptyId = '';
      const useCaseError = new UseCaseError('Invalid order ID');

      mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

      const result = await controller.handle(emptyId);

      ResultAssertionHelper.assertResultFailure(result);

      expect(mockUseCase.execute).toHaveBeenCalledWith(emptyId);
    });

    it('should handle null order ID', async () => {
      const nullId = null as any;
      const useCaseError = new UseCaseError('Invalid order ID');

      mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

      const result = await controller.handle(nullId);

      ResultAssertionHelper.assertResultFailure(result);
      expect(mockUseCase.execute).toHaveBeenCalledWith(nullId);
    });

    it('should handle network timeout error', async () => {
      const orderId = 'OR0000001';
      const timeoutError = new Error('Request timeout');

      mockUseCase.execute.mockRejectedValue(timeoutError);

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        timeoutError,
      );
    });
  });

  describe('order cancellation scenarios', () => {
    it('should cancel order with single item', async () => {
      const orderId = 'OR0000001';
      const cancelledOrder = OrderTestFactory.createCancelledOrder({
        id: orderId,
        items: [OrderTestFactory.createMockOrder().items[0]],
      });

      mockUseCase.execute.mockResolvedValue(Result.success(cancelledOrder));

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.status).toBe(OrderStatus.CANCELLED);
      }
    });

    it('should cancel order with multiple items', async () => {
      const orderId = 'OR0000001';
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const cancelledOrder = {
        ...multiItemOrder,
        id: orderId,
        status: OrderStatus.CANCELLED,
      };

      mockUseCase.execute.mockResolvedValue(Result.success(cancelledOrder));

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.items).toHaveLength(5);
        expect(result.value.status).toBe(OrderStatus.CANCELLED);
      }
    });

    it('should cancel cash on delivery order', async () => {
      const orderId = 'OR0000001';
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder();
      const cancelledOrder = {
        ...codOrder,
        id: orderId,
        status: OrderStatus.CANCELLED,
      };

      mockUseCase.execute.mockResolvedValue(Result.success(cancelledOrder));

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.paymentMethod).toBe(
          PaymentMethodType.CASH_ON_DELIVERY,
        );
        expect(result.value.status).toBe(OrderStatus.CANCELLED);
      }
    });
  });
});
