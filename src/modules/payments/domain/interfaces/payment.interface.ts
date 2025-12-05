// src/modules/payments/domain/interfaces/payment.interface.ts
import { PaymentMethodType } from '../value-objects/payment-method';
import { PaymentStatusType } from '../value-objects/payment-status';
import { IRefund } from './refund.interface';

export interface IPayment {
  id: string | null;
  orderId: string;
  customerId: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  status: PaymentStatusType;
  transactionId: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  refunds: IRefund[];
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}
