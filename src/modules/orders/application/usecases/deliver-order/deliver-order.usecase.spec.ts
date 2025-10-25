// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.spec.ts
import { DeliverOrderUseCase } from './deliver-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { DeliverOrderDto } from '../../../presentation/dto/deliver-order.dto';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';

describe('DeliverOrderUseCase', () => {
  let useCase: DeliverOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new DeliverOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if COD order is delivered with payment collection', async () => {
      const shippedOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: PaymentMethod.CASH_ON_DELIVERY,
          status: 'not_required_yet' as any,
        },
      });

      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: 'COD-123456',
          notes: 'Cash collected on delivery',
        },
      };

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
      expect(result.value.id).toBe(shippedOrder.id);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        shippedOrder.id,
      );
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        shippedOrder.id,
        OrderStatus.DELIVERED,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('should return Success if online payment order is delivered', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder({
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: PaymentMethod.CREDIT_CARD,
          status: 'completed' as any,
          paidAt: new Date(),
        },
      });

      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should return Success if COD order is delivered without explicit payment details', async () => {
      const shippedOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: PaymentMethod.CASH_ON_DELIVERY,
          status: 'not_required_yet' as any,
        },
      });

      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 'OR9999';
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute({ id: orderId, deliverOrderDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        RepositoryError,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be delivered (not in SHIPPED status)', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute({
        id: pendingOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
        UseCaseError,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        pendingOrder.id,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute({
        id: pendingOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(confirmedOrder);

      const result = await useCase.execute({
        id: confirmedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PROCESSING status', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(processingOrder);

      const result = await useCase.execute({
        id: processingOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(deliveredOrder);

      const result = await useCase.execute({
        id: deliveredOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(cancelledOrder);

      const result = await useCase.execute({
        id: cancelledOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if updateStatus fails', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();
      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockUpdateStatusFailure('Database error');

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );

      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        shippedOrder.id,
        OrderStatus.DELIVERED,
      );
    });

    it('should return Failure if repository throws unexpected error', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();
      const deliverOrderDto: DeliverOrderDto = {};
      const unexpectedError = new Error('Network connection failed');

      mockOrderRepository.findById.mockRejectedValue(unexpectedError);

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Usecase Error',
        UseCaseError,
        unexpectedError,
      );
    });

    it('should deliver order with Stripe payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: 'stripe' as any,
          status: 'completed' as any,
          paidAt: new Date(),
        },
      });

      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(stripeOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: stripeOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver order with PayPal payment method', async () => {
      const paypalOrder = OrderTestFactory.createPayPalOrder({
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: 'paypal' as any,
          status: 'completed' as any,
          paidAt: new Date(),
        },
      });

      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(paypalOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: paypalOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deliver multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const shippedMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...multiItemOrder.paymentInfo,
          method: 'cash_on_delivery' as any,
          status: 'not_required_yet' as any,
        },
      };

      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: 'COD-789',
          notes: 'Payment collected',
        },
      };

      mockOrderRepository.mockSuccessfulFind(shippedMultiItem);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedMultiItem.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(5);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver COD order with custom transaction ID', async () => {
      const shippedOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
      });

      const customTransactionId = 'CUSTOM-COD-123';
      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          transactionId: customTransactionId,
          notes: 'Custom payment collection',
        },
      };

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver COD order with only notes provided', async () => {
      const shippedOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
      });

      const deliverOrderDto: DeliverOrderDto = {
        codPayment: {
          notes: 'Payment collected in cash',
        },
      };

      mockOrderRepository.mockSuccessfulFind(shippedOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should return Failure if COD order payment already completed', async () => {
      const shippedOrder = OrderTestFactory.createCashOnDeliveryOrder({
        status: OrderStatus.SHIPPED,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: PaymentMethod.CASH_ON_DELIVERY,
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      });

      const deliverOrderDto: DeliverOrderDto = {};

      mockOrderRepository.mockSuccessfulFind(shippedOrder);

      const result = await useCase.execute({
        id: shippedOrder.id,
        deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
