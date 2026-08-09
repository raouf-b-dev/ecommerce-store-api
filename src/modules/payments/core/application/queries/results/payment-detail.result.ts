import { PaymentListItemDTO } from './payment-list-item.result';

export interface PaymentDetailDTO extends PaymentListItemDTO {
  failureReason?: string | null;
  metadata?: Record<string, any> | null;
  updatedAt: string;
}

export type PaymentDetailResult = PaymentDetailDTO;
