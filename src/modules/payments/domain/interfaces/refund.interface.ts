//src\modules\payments\domain\interfaces\refund.interface.ts
export interface IRefund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
