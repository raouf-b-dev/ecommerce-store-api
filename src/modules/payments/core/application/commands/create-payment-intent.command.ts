import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';

export interface CreatePaymentIntentCommand {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  userId: number;
  metadata?: Record<string, any>;
  callerContext?: CallerContext | null;
}
