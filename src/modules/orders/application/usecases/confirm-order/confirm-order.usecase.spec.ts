// src/modules/orders/application/usecases/confirm-order/confirm-order.usecase.spec.ts
import { ConfirmOrderUseCase } from './confirm-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { DomainError } from '../../../../../core/errors/domain.error';
import { PaymentMethodType } from '../../../../payments/domain';
import { Result } from '../../../../../core/domain/result';

const createMockOrderScheduler = () => ({
  scheduleCheckout: jest.fn(),
  schedulePostPayment: jest.fn(),
  scheduleStockRelease: jest.fn(),
  schedulePostConfirmation: jest
    .fn()
    .mockResolvedValue(Result.success('post-confirm-flow-id')),
});

describe('ConfirmOrderUseCase', () => {
  let useCase: ConfirmOrderUseCase;
  let mockOrderRepository: MockOrderRepository;
  let mockOrderScheduler: ReturnType<typeof createMockOrderScheduler>;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    mockOrderScheduler = createMockOrderScheduler();
    useCase = new ConfirmOrderUseCase(
      mockOrderRepository,
      mockOrderScheduler as any,
    );
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if COD order is confirmed', async () => {
      const pendingOrder =
        OrderTestFactory.createCODOrderReadyForConfirmation();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: pendingOrder.id! });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
      expect(result.value.id).toBe(pendingOrder.id);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        pendingOrder.id!,
      );
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        pendingOrder.id!,
        OrderStatus.CONFIRMED,
      );
      expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledTimes(1);
    });

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
        // Online payment order is already confirmed, so confirmPayment fails
        'Payment can only be confirmed when order is pending payment',
        DomainError,
      );

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        confirmedOrder.id!,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if online payment order has pending payment', async () => {
      const pendingOrder =
        OrderTestFactory.createOnlineOrderNotReadyForConfirmation();

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
        // Cancelled order has no payment, so fails at payment check
        'Cannot confirm order - payment must be completed first',
        DomainError,
      );

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if updateStatus fails', async () => {
      const pendingOrder =
        OrderTestFactory.createCODOrderReadyForConfirmation();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);
      mockOrderRepository.mockUpdateStatusFailure('Database error');

      const result = await useCase.execute({ orderId: pendingOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );

      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        pendingOrder.id!,
        OrderStatus.CONFIRMED,
      );
    });

    it('should return Failure if repository throws unexpected error', async () => {
      const pendingOrder = OrderTestFactory.createPendingPaymentOrder();
      const unexpectedError = new Error('Network connection failed');

      mockOrderRepository.findById.mockRejectedValue(unexpectedError);

      const result = await useCase.execute({ orderId: pendingOrder.id! });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Usecase Error',
        UseCaseError,
        unexpectedError,
      );
    });

    it('should confirm order with Stripe payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: 1, // Payment already completed
      });

      mockOrderRepository.mockSuccessfulFind(stripeOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: stripeOrder.id! });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should confirm order with PayPal payment method', async () => {
      const paypalOrder = OrderTestFactory.createPayPalOrder({
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: 1, // Payment already completed
      });

      mockOrderRepository.mockSuccessfulFind(paypalOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute({ orderId: paypalOrder.id! });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should confirm multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const pendingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PENDING_CONFIRMATION,
        paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
        paymentId: null,
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
