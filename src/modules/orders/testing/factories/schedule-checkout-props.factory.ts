import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class ScheduleCheckoutPropsFactory {
  static createMockProps(
    overrides?: Partial<ScheduleCheckoutProps>,
  ): ScheduleCheckoutProps {
    const baseProps: ScheduleCheckoutProps = {
      cartId: 1,
      userId: 1,
      orderId: 100,
      shippingAddress: {
        id: 1,
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'Test Country',
        street2: '123 Test St',
        phone: '1234567890',
        deliveryInstructions: 'Test Delivery Instructions',
      },
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      flowId: 'flow-123',
    };

    return { ...baseProps, ...overrides };
  }
}
