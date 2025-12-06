// src/modules/orders/presentation/controllers/ship-order/ship-order.controller.spec.ts
import { ShipOrderController } from './ship-order.controller';
import { ShipOrderUseCase } from '../../../application/usecases/ship-order/ship-order.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMethodType } from '../../../../payments/domain';

describe('ShipOrderController', () => {
  let controller: ShipOrderController;
  let mockShipOrderUseCase: jest.Mocked<ShipOrderUseCase>;

  beforeEach(() => {
    mockShipOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ShipOrderUseCase>;

    controller = new ShipOrderController(mockShipOrderUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if order is shipped', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.success(shippedOrder),
      );

      const result = await controller.handle(shippedOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(shippedOrder);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);

      expect(mockShipOrderUseCase.execute).toHaveBeenCalledWith(
        shippedOrder.id,
      );
      expect(mockShipOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order shipping fails', async () => {
      const orderId = 'OR0001';

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order is not in a shippable state',
        UseCaseError,
      );

      expect(mockShipOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockShipOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order not found', async () => {
      const orderId = 'OR9999';

      const usecaseError = Result.failure(
        ErrorFactory.UseCaseError('Order with id OR9999 not found').error,
      );
      mockShipOrderUseCase.execute.mockResolvedValue(usecaseError);

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

      mockShipOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );

      expect(mockShipOrderUseCase.execute).toHaveBeenCalledWith(orderId);
      expect(mockShipOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should ship order with COD payment', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.PROCESSING,
      });
      const shippedCOD = {
        ...codOrder,
        status: OrderStatus.SHIPPED,
      };

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.success(shippedCOD),
      );

      const result = await controller.handle(codOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should ship order with completed online payment', async () => {
      const onlineOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PROCESSING,
        paymentId: 'PAY_STRIPE_001',
      });
      const shippedOnline = {
        ...onlineOrder,
        status: OrderStatus.SHIPPED,
      };

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.success(shippedOnline),
      );

      const result = await controller.handle(onlineOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentId).toBeDefined();
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should fail to ship order in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(pendingOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order is not in a shippable state',
      );
    });

    it('should fail to ship order in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(confirmedOrder.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order is not in a shippable state',
      );
    });

    it('should ship multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(3);
      const processingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PROCESSING,
        paymentId: 'PAY001',
      };
      const shippedMultiItem = {
        ...processingMultiItem,
        status: OrderStatus.SHIPPED,
      };

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.success(shippedMultiItem),
      );

      const result = await controller.handle(processingMultiItem.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(3);
      expect(result.value.status).toBe(OrderStatus.SHIPPED);
    });

    it('should fail to ship already shipped order', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(shippedOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should fail to ship delivered order', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(deliveredOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should fail to ship cancelled order', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockShipOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order is not in a shippable state').error,
        ),
      );

      const result = await controller.handle(cancelledOrder.id);

      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
