export interface PaymentListItemDTO {
  id: number;
  orderId: number;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
}

export type PaymentListItemResult = PaymentListItemDTO;
