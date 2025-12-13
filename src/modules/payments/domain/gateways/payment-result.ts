// src/modules/payments/domain/gateways/payment-result.ts
import { PaymentStatusType } from '../value-objects/payment-status';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatusType;
  metadata?: Record<string, any>;
  errorMessage?: string;
}
