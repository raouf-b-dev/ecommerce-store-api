// src/modules/orders/domain/interfaces/IPaymentInfo.ts
import { PaymentMethod } from '../value-objects/payment-method';
import { PaymentStatus } from '../value-objects/payment-status';

export interface IPaymentInfo extends IPaymentInfoEditable {
  id: string;
  method: PaymentMethod;
  amount: number;
}

export interface IPaymentInfoEditable {
  status: PaymentStatus;
  transactionId: string | null;
  paidAt: Date | null;
  notes: string | null;
}
