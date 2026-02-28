// src/modules/payments/core/domain/interfaces/payment.interface.ts
import { PaymentMethodType } from '../value-objects/payment-method';
import { PaymentStatusType } from '../value-objects/payment-status';
import { IRefund } from './refund.interface';

export interface IPayment {
  id: number | null;
  orderId: number;
  customerId: number | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  status: PaymentStatusType;
  transactionId: string | null;
  gatewayPaymentIntentId: string | null;
  gatewayClientSecret: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  refunds: IRefund[];
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}
