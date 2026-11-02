import { PaymentListItemDTO } from './payment-list-item.result';

export interface PaymentDetailDTO extends PaymentListItemDTO {
  gatewayPaymentIntentId: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt: string;
}

export type PaymentDetailResult = PaymentDetailDTO;
