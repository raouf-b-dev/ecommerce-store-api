// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.spec.ts
import {
  DeliverOrderUseCase,
  DeliverOrderCommand,
} from './deliver-order.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

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
    it('should return Success if online payment order is delivered', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder({
        paymentMethod: PaymentMethodType.STRIPE,
        paymentId: 1,
      });

      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(shippedOrder);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        id: shippedOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 999;
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute({
        id: orderId,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        RepositoryError,
      );

      expect(mockOrderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be delivered (not in SHIPPED status)', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(pendingOrder);

      const result = await useCase.execute({
        id: pendingOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
        DomainError,
      );

      expect(mockOrderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        pendingOrder.id!,
      );
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PENDING status', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(pendingOrder);

      const result = await useCase.execute({
        id: pendingOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in CONFIRMED status', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(confirmedOrder);

      const result = await useCase.execute({
        id: confirmedOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is in PROCESSING status', async () => {
      const processingOrder = OrderTestFactory.createProcessingOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(processingOrder);

      const result = await useCase.execute({
        id: processingOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(deliveredOrder);

      const result = await useCase.execute({
        id: deliveredOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(cancelledOrder);

      const result = await useCase.execute({
        id: cancelledOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be delivered in current state',
      );

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure if save fails', async () => {
      const shippedOrder = OrderTestFactory.createShippedOrder();
      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(shippedOrder);
      mockOrderRepository.mockSaveFailure('Database error');

      const result = await useCase.execute({
        id: shippedOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );

      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should deliver order with Stripe payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.SHIPPED,
      });

      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(stripeOrder);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        id: stripeOrder.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });

    it('should deliver multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const shippedMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.SHIPPED,
        paymentMethod: PaymentMethodType.STRIPE,
      };

      const deliverOrderDto: DeliverOrderCommand = {};

      mockOrderRepository.mockSuccessfulFindByIdForUpdate(shippedMultiItem);
      mockOrderRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        id: shippedMultiItem.id!,
        command: deliverOrderDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(5);
      expect(result.value.status).toBe(OrderStatus.DELIVERED);
    });
  });
});
