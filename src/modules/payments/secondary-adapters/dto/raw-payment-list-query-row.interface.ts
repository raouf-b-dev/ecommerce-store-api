import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export interface RawPaymentListQueryRow {
  id: number;
  orderId: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: PaymentMethodType;
  transactionId: string | null;
  gatewayPaymentIntentId?: string | null;
  failureReason?: string | null;
  metadata?: string | Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
