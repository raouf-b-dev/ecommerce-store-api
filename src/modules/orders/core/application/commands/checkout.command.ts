import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { ShippingAddressInput } from '../services/shipping-address-resolver';

export interface CheckoutResult {
  orderId: number;
  jobId: string;
  status: OrderStatus;
  message: string;
}

export interface CheckoutCommand {
  cartId: number;
  paymentMethod: PaymentMethodType;
  shippingAddress?: ShippingAddressInput;
  customerNotes?: string;
  callerContext: CallerContext | null;
}
