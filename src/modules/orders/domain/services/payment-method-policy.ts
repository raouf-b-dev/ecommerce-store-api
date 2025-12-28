import { Injectable } from '@nestjs/common';
import { PaymentMethodType } from '../../../payments/domain/value-objects/payment-method';
import { OrderStatus } from '../value-objects/order-status';

@Injectable()
export class PaymentMethodPolicy {
  private readonly onlinePaymentMethods: ReadonlySet<PaymentMethodType> =
    new Set([
      PaymentMethodType.CREDIT_CARD,
      PaymentMethodType.DEBIT_CARD,
      PaymentMethodType.PAYPAL,
      PaymentMethodType.DIGITAL_WALLET,
    ]);

  isOnlinePayment(method: PaymentMethodType): boolean {
    return this.onlinePaymentMethods.has(method);
  }

  isCashOnDelivery(method: PaymentMethodType): boolean {
    return method === PaymentMethodType.CASH_ON_DELIVERY;
  }

  getInitialOrderStatus(method: PaymentMethodType): OrderStatus {
    if (this.isCashOnDelivery(method)) {
      return OrderStatus.PENDING_CONFIRMATION;
    }
    return OrderStatus.PENDING_PAYMENT;
  }

  getCheckoutMessage(method: PaymentMethodType): string {
    if (this.isOnlinePayment(method)) {
      return 'Checkout initiated. Please check order status for payment details.';
    }
    return 'Order placement initiated.';
  }

  requiresManualConfirmation(method: PaymentMethodType): boolean {
    return this.isCashOnDelivery(method);
  }
}
