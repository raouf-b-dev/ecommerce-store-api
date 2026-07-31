// src/modules/orders/application/usecases/confirm-order/confirm-order.usecase.spec.ts
import { ConfirmOrderUseCase } from './confirm-order.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  ResultAssertionHelper,
  LoggerTestHelper,
} from '../../../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('ConfirmOrderUseCase', () => {
  let useCase: ConfirmOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  beforeEach(() => {
    LoggerTestHelper.silence();
    mockOrderRepository = new MockOrderRepository();
    useCase = new ConfirmOrderUseCase(mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should return Success if online payment order with completed payment is confirmed', async () => {
      const pendingOrder =
        OrderTestFactory.createOnlineOrderReadyForConfirmation();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: pendingOrder.id! });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 999;
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute({ orderId: orderId });

      ResultAssertionHelper.assertResultFailure(
        result,
        'not found',
        RepositoryError,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be confirmed (already confirmed)', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockOrderRepository.mockSuccessfulFind(confirmedOrder);

      const result = await useCase.execute({ orderId: confirmedOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment can only be confirmed when order is pending payment',
        DomainError,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        confirmedOrder.id!,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if online payment order has pending payment without paymentId', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute({ orderId: pendingOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cannot confirm order - payment must be completed first',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockOrderRepository.mockSuccessfulFind(deliveredOrder);

      const result = await useCase.execute({ orderId: deliveredOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment can only be confirmed when order is pending payment',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockOrderRepository.mockSuccessfulFind(cancelledOrder);

      const result = await useCase.execute({ orderId: cancelledOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cannot confirm order - payment must be completed first',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should confirm order with Stripe payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: 1,
      });

      mockOrderRepository.mockSuccessfulFind(stripeOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: stripeOrder.id! });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should confirm multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const pendingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: 1,
      };

      mockOrderRepository.mockSuccessfulFind(pendingMultiItem);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: pendingMultiItem.id! });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(5);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });
  });
});
