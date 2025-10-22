// src/modules/orders/application/usecases/confirm-order/confirm-order.usecase.spec.ts
import { ConfirmOrderUseCase } from './confirm-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../core/errors/repository.error';

describe('ConfirmOrderUseCase', () => {
  let useCase: ConfirmOrderUseCase;
  let mockOrderRepository: MockOrderRepository;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new ConfirmOrderUseCase(mockOrderRepository);
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

      const result = await useCase.execute(pendingOrder.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.status).toBe(OrderStatus.CONFIRMED);
        expect(result.value.id).toBe(pendingOrder.id);
      }

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        pendingOrder.id,
      );
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        pendingOrder.id,
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

      const result = await useCase.execute(pendingOrder.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.status).toBe(OrderStatus.CONFIRMED);
      }
    });

    it('should return Failure if order is not found', async () => {
      const orderId = 'OR9999';
      mockOrderRepository.mockOrderNotFound(orderId);

      const result = await useCase.execute(orderId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('not found');
      }

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order cannot be confirmed (not in PENDING status)', async () => {
      const confirmedOrder = OrderTestFactory.createConfirmedOrder();

      mockOrderRepository.mockSuccessfulFind(confirmedOrder);

      const result = await useCase.execute(confirmedOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(
          'Order is not in a confirmable state',
        );
      }

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(
        confirmedOrder.id,
      );
      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if online payment order has pending payment', async () => {
      const pendingOrder =
        OrderTestFactory.createOnlineOrderNotReadyForConfirmation();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);

      const result = await useCase.execute(pendingOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(
          'Order is not in a confirmable state',
        );
      }

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is already delivered', async () => {
      const deliveredOrder = OrderTestFactory.createDeliveredOrder();

      mockOrderRepository.mockSuccessfulFind(deliveredOrder);

      const result = await useCase.execute(deliveredOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'Order is not in a confirmable state',
        );
      }

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if order is cancelled', async () => {
      const cancelledOrder = OrderTestFactory.createCancelledOrder();

      mockOrderRepository.mockSuccessfulFind(cancelledOrder);

      const result = await useCase.execute(cancelledOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          'Order is not in a confirmable state',
        );
      }

      expect(mockOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return Failure if updateStatus fails', async () => {
      const pendingOrder =
        OrderTestFactory.createCODOrderReadyForConfirmation();

      mockOrderRepository.mockSuccessfulFind(pendingOrder);
      mockOrderRepository.mockUpdateStatusFailure('Database error');

      const result = await useCase.execute(pendingOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toBe('Database error');
      }

      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        pendingOrder.id,
        OrderStatus.CONFIRMED,
      );
    });

    it('should return Failure if repository throws unexpected error', async () => {
      const pendingOrder = OrderTestFactory.createPendingOrder();
      const unexpectedError = new Error('Network connection failed');

      mockOrderRepository.findById.mockRejectedValue(unexpectedError);

      const result = await useCase.execute(pendingOrder.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected Usecase Error');
        expect(result.error.cause).toBe(unexpectedError);
      }
    });

    it('should confirm order with Stripe payment method', async () => {
      const stripeOrder = OrderTestFactory.createStripeOrder({
        status: OrderStatus.PENDING,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: 'stripe' as any,
          status: 'completed' as any,
          paidAt: new Date(),
        },
      });

      mockOrderRepository.mockSuccessfulFind(stripeOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(stripeOrder.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.status).toBe(OrderStatus.CONFIRMED);
      }
    });

    it('should confirm order with PayPal payment method', async () => {
      const paypalOrder = OrderTestFactory.createPayPalOrder({
        status: OrderStatus.PENDING,
        paymentInfo: {
          ...OrderTestFactory.createMockOrder().paymentInfo,
          method: 'paypal' as any,
          status: 'completed' as any,
          paidAt: new Date(),
        },
      });

      mockOrderRepository.mockSuccessfulFind(paypalOrder);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(paypalOrder.id);

      expect(isSuccess(result)).toBe(true);
    });

    it('should confirm multi-item order', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(5);
      const pendingMultiItem = {
        ...multiItemOrder,
        status: OrderStatus.PENDING,
        paymentInfo: {
          ...multiItemOrder.paymentInfo,
          method: 'cash_on_delivery' as any,
          status: 'not_required_yet' as any,
        },
      };

      mockOrderRepository.mockSuccessfulFind(pendingMultiItem);
      mockOrderRepository.mockSuccessfulUpdateStatus();

      const result = await useCase.execute(pendingMultiItem.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.items).toHaveLength(5);
        expect(result.value.status).toBe(OrderStatus.CONFIRMED);
      }
    });
  });
});
