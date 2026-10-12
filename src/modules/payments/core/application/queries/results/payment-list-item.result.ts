import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';

export interface PaymentListItemDTO {
  id: number;
  orderId: number;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: PaymentMethodType;
  transactionId: string;
  createdAt: string;
}

export type PaymentListItemResult = PaymentListItemDTO;
