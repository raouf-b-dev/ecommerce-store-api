import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';

export interface PaymentMethodDetailsInput {
  token?: string;
  cardLast4?: string;
  cardBrand?: string;
  walletId?: string;
}

export interface CreatePaymentCommand {
  orderId: number;
  amount: number;
  paymentMethod: PaymentMethodType;
  currency: string;
  paymentMethodDetails?: PaymentMethodDetailsInput;
  userId?: number;
  callerContext: CallerContext | null;
}
