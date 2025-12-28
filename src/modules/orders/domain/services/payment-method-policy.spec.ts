import { PaymentMethodPolicy } from './payment-method-policy';
import { PaymentMethodType } from '../../../payments/domain/value-objects/payment-method';
import { OrderStatus } from '../value-objects/order-status';

describe('PaymentMethodPolicy', () => {
  let policy: PaymentMethodPolicy;

  beforeEach(() => {
    policy = new PaymentMethodPolicy();
  });

  describe('isOnlinePayment', () => {
    it('should return true for CREDIT_CARD', () => {
      expect(policy.isOnlinePayment(PaymentMethodType.CREDIT_CARD)).toBe(true);
    });

    it('should return true for DEBIT_CARD', () => {
      expect(policy.isOnlinePayment(PaymentMethodType.DEBIT_CARD)).toBe(true);
    });

    it('should return true for PAYPAL', () => {
      expect(policy.isOnlinePayment(PaymentMethodType.PAYPAL)).toBe(true);
    });

    it('should return true for DIGITAL_WALLET', () => {
      expect(policy.isOnlinePayment(PaymentMethodType.DIGITAL_WALLET)).toBe(
        true,
      );
    });

    it('should return false for CASH_ON_DELIVERY', () => {
      expect(policy.isOnlinePayment(PaymentMethodType.CASH_ON_DELIVERY)).toBe(
        false,
      );
    });
  });

  describe('isCashOnDelivery', () => {
    it('should return true for CASH_ON_DELIVERY', () => {
      expect(policy.isCashOnDelivery(PaymentMethodType.CASH_ON_DELIVERY)).toBe(
        true,
      );
    });

    it('should return false for CREDIT_CARD', () => {
      expect(policy.isCashOnDelivery(PaymentMethodType.CREDIT_CARD)).toBe(
        false,
      );
    });
  });

  describe('getInitialOrderStatus', () => {
    it('should return PENDING_CONFIRMATION for CASH_ON_DELIVERY', () => {
      expect(
        policy.getInitialOrderStatus(PaymentMethodType.CASH_ON_DELIVERY),
      ).toBe(OrderStatus.PENDING_CONFIRMATION);
    });

    it('should return PENDING_PAYMENT for CREDIT_CARD', () => {
      expect(policy.getInitialOrderStatus(PaymentMethodType.CREDIT_CARD)).toBe(
        OrderStatus.PENDING_PAYMENT,
      );
    });

    it('should return PENDING_PAYMENT for PAYPAL', () => {
      expect(policy.getInitialOrderStatus(PaymentMethodType.PAYPAL)).toBe(
        OrderStatus.PENDING_PAYMENT,
      );
    });
  });

  describe('getCheckoutMessage', () => {
    it('should return online message for CREDIT_CARD', () => {
      expect(policy.getCheckoutMessage(PaymentMethodType.CREDIT_CARD)).toBe(
        'Checkout initiated. Please check order status for payment details.',
      );
    });

    it('should return COD message for CASH_ON_DELIVERY', () => {
      expect(
        policy.getCheckoutMessage(PaymentMethodType.CASH_ON_DELIVERY),
      ).toBe('Order placement initiated.');
    });
  });

  describe('requiresManualConfirmation', () => {
    it('should return true for CASH_ON_DELIVERY', () => {
      expect(
        policy.requiresManualConfirmation(PaymentMethodType.CASH_ON_DELIVERY),
      ).toBe(true);
    });

    it('should return false for CREDIT_CARD', () => {
      expect(
        policy.requiresManualConfirmation(PaymentMethodType.CREDIT_CARD),
      ).toBe(false);
    });
  });
});
