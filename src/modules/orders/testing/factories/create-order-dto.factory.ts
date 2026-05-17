import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { CheckoutCommand } from '../../core/application/usecases/checkout/checkout.usecase';
import { DeliverOrderCommand } from '../../core/application/usecases/deliver-order/deliver-order.usecase';

export class OrderCommandTestFactory {
  static createCheckoutCommand(
    overrides?: Partial<CheckoutCommand>,
  ): CheckoutCommand {
    const baseCommand: CheckoutCommand = {
      cartId: 1,
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      },
    };

    return { ...baseCommand, ...overrides };
  }

  static createCreditCardCheckoutCommand(
    overrides?: Partial<CheckoutCommand>,
  ): CheckoutCommand {
    return this.createCheckoutCommand({
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      ...overrides,
    });
  }

  static createCashOnDeliveryCheckoutCommand(
    overrides?: Partial<CheckoutCommand>,
  ): CheckoutCommand {
    return this.createCheckoutCommand({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      ...overrides,
    });
  }

  static createDeliverOrderCommand(
    overrides?: Partial<DeliverOrderCommand>,
  ): DeliverOrderCommand {
    const baseCommand: DeliverOrderCommand = {
      codPayment: {
        transactionId: 'COD-123456',
        notes: 'Cash collected on delivery',
        collectedBy: 'Driver John Doe',
      },
    };

    return { ...baseCommand, ...overrides };
  }

  static createEmptyDeliverOrderCommand(): DeliverOrderCommand {
    return {};
  }
}
