export interface RawPaymentListQueryRow {
  id: number | string;
  orderId: number | string;
  userId: number | string;
  userName: string | null;
  userEmail: string | null;
  amount: number | string;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  failureReason?: string | null;
  metadata?: string | Record<string, any> | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
