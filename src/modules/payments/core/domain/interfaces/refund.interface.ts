import { RefundStatusType } from '../value-objects/refund-status';

//src\modules\payments\domain\interfaces\refund.interface.ts
export interface IRefund {
  id: number | null;
  paymentId: number;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatusType;
  createdAt: Date;
  updatedAt: Date;
}
