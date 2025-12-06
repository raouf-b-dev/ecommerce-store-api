// src/modules/orders/presentation/controllers/deliver-order/deliver-order.controller.spec.ts
import { DeliverOrderController } from './deliver-order.controller';
import { DeliverOrderUseCase } from '../../../application/usecases/deliver-order/deliver-order.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { DeliverOrderDto } from '../../dto/deliver-order.dto';
import { PaymentMethodType } from '../../../../payments/domain';
import { ResultAssertionHelper } from '../../../../../testing';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('DeliverOrderController', () => {
  let controller: DeliverOrderController;
  let mockDeliverOrderUseCase: jest.Mocked<DeliverOrderUseCase>;

  beforeEach(() => {
    mockDeliverOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeliverOrderUseCase>;

    controller = new DeliverOrderController(mockDeliverOrderUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if COD order is delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder({
        paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
        paymentId: 'PAY_COD_001',
      });

      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: 'COD-123456',
          notes: 'Cash collected on delivery',
        },
      };

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredOrder),
      );

      const result = await controller.handle(
        deliveredOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(deliveredOrder);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);

      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledWith({
        id: deliveredOrder.id,
        deliverOrderDto,
      });
      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return success if online payment order is delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredOrder),
      );

      const result = await controller.handle(
        deliveredOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should return Failure(ControllerError) if order delivery fails', async () => {
      const orderId = 'OR0001';
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(orderId, deliverOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
        UseCaseError,
      );

      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledWith({
        id: orderId,
        deliverOrderDto,
      });
      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if order not found', async () => {
      const orderId = 'OR9999';
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Order with id OR9999 not found').error,
        ),
      );

      const result = await controller.handle(orderId, deliverOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        UseCaseError,
      );
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const orderId = 'OR0001';
      const deliverOrderDto: DeliverOrderDto = {};
      const error = new Error('Database connection failed');

      mockDeliverOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(orderId, deliverOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );

      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledWith({
        id: orderId,
        deliverOrderDto,
      });
      expect(mockDeliverOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should deliver COD order with payment details', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
      });
      const deliveredCOD = {
        ...codOrder,
        status: OrderStatus.DELIVERED,
        paymentId: 'PAY_COD_001',
      };

      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: 'COD-789',
          notes: 'Payment collected',
        },
      };

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredCOD),
      );

      const result = await controller.handle(codOrder.id, deliverOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver COD order without explicit payment details', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
      });
      const deliveredCOD = {
        ...codOrder,
        status: OrderStatus.DELIVERED,
      };

      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredCOD),
      );

      const result = await controller.handle(codOrder.id, deliverOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver order with completed online payment', async () => {
      const onlineOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.SHIPPED,
        paymentId: 'PAY_STRIPE_001',
      });
      const deliveredOnline = {
        ...onlineOrder,
        status: OrderStatus.DELIVERED,
      };

      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredOnline),
      );

      const result = await controller.handle(onlineOrder.id, deliverOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentId).toBeDefined();
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should fail to deliver order in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(pendingOrder.id, deliverOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );
    });

    it('should fail to deliver order in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(
        confirmedOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );
    });

    it('should fail to deliver order in PROCESSING status', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(
        processingOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );
    });

    it('should deliver multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(3);
      const shippedMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.SHIPPED,
        paymentId: 'PAY001',
      };
      const deliveredMultiItem = {
        ...shippedMultiItem,
        status: OrderStatus.DELIVERED,
      };

      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredMultiItem),
      );

      const result = await controller.handle(
        shippedMultiItem.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(3);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should fail to deliver already delivered order', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(
        deliveredOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should fail to deliver cancelled order', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(
        cancelledOrder.id,
        deliverOrderDto,
      );

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should convert UseCaseError to ControllerError', async () => {
      const orderId = 'OR0001';
      const deliverOrderDto: DeliverOrderDto = {};

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(
            'Order cannot be delivered in current state',
          ).error,
        ),
      );

      const result = await controller.handle(orderId, deliverOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        UseCaseError,
      );
    });

    it('should handle delivery with custom COD transaction ID', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
      });
      const deliveredCOD = {
        ...codOrder,
        status: OrderStatus.DELIVERED,
      };

      const customTransactionId = 'CUSTOM-COD-999';
      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: customTransactionId,
          notes: 'Custom payment collection',
        },
      };

      mockDeliverOrderUseCase.execute.mockResolvedValue(
        Result.success(deliveredCOD),
      );

      const result = await controller.handle(codOrder.id, deliverOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });
  });
});
