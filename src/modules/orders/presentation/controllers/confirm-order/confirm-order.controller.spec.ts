// src/modules/orders/presentation/controllers/confirm-order/confirm-order.controller.spec.ts
import { ConfirmOrderController } from './confirm-order.controller';
import { ConfirmOrderUseCase } from '../../../application/usecases/confirm-order/confirm-order.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('ConfirmOrderController', () => {
  let controller: ConfirmOrderController;
  let mockConfirmOrderUseCase: jest.Mocked<ConfirmOrderUseCase>;

  beforeEach(() => {
    mockConfirmOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ConfirmOrderUseCase>;

    controller = new ConfirmOrderController(mockConfirmOrderUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if order is confirmed', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.success(confirmedOrder),
      );

      const result = await controller.handle(confirmedOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(confirmedOrder);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);

      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledWith(
        confirmedOrder.id,
      );
      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order confirmation fails', async () => {
      const orderId = 'OR0001';

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a confirmable state')
            .error,
        ),
      );

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order is not in a confirmable state',
        UseCaseError,
      );

      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order not found', async () => {
      const orderId = 'OR9999';

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order with id OR9999 not found').error,
        ),
      );

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        UseCaseError,
      );
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const orderId = 'OR0001';
      const error = new Error('Database connection failed');

      mockConfirmOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );

      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockConfirmOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should confirm COD order', async () => {
      const codOrder = OrderTestFactory.createCODOrderReadyForConfirmation();
      const confirmedCOD = {
        ...codOrder,
        status: OrderStatus.CONFIRMED,
      };

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.success(confirmedCOD),
      );

      const result = await controller.handle(codOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentInfo.method).toBe('cash_on_delivery');
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should confirm online payment order with completed payment', async () => {
      const onlineOrder =
        OrderTestFactory.createOnlineOrderReadyForConfirmation();
      const confirmedOnline = {
        ...onlineOrder,
        status: OrderStatus.CONFIRMED,
      };

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.success(confirmedOnline),
      );

      const result = await controller.handle(onlineOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentInfo.status).toBe('completed');
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should fail to confirm online payment order with pending payment', async () => {
      const onlineOrder =
        OrderTestFactory.createOnlineOrderNotReadyForConfirmation();

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a confirmable state')
            .error,
        ),
      );

      const result = await controller.handle(onlineOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order is not in a confirmable state',
      );
    });

    it('should confirm multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(3);
      const pendingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PENDING,
        paymentInfo: {
          ...multiItemOrder.paymentInfo,
          method: 'cash_on_delivery' as any,
          status: 'not_required_yet' as any,
        },
      };
      const confirmedMultiItem = {
        ...pendingMultiItem,
        status: OrderStatus.CONFIRMED,
      };

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.success(confirmedMultiItem),
      );

      const result = await controller.handle(pendingMultiItem.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(3);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should fail to confirm already confirmed order', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a confirmable state')
            .error,
        ),
      );

      const result = await controller.handle(confirmedOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should fail to confirm delivered order', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a confirmable state')
            .error,
        ),
      );

      const result = await controller.handle(deliveredOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should fail to confirm cancelled order', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockConfirmOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a confirmable state')
            .error,
        ),
      );

      const result = await controller.handle(cancelledOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
