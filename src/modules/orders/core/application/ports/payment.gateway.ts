import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface RecordCodPaymentInput {
  orderId: number;
  amountCollected: number;
  currency: string;
  notes?: string;
  collectedBy?: string;
}

export interface PaymentRecord {
  id: number | null;
}

export interface PaymentGateway {
  recordCodPayment(
    input: RecordCodPaymentInput,
  ): Promise<Result<PaymentRecord, InfrastructureError>>;
}
