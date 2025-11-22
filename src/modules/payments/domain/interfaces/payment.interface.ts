// src/modules/payments/domain/interfaces/payment.interface.ts
export interface IPayment {
  id: string;
  orderId: string;
  customerId: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  transactionId: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}
