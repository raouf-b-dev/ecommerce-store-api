import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';

export interface PaymentCompletedProps {
  orderId: number;
  paymentId: number;
  transactionId?: string;
  reservationId?: number;
  cartId?: number;
}

export interface PaymentFailedProps {
  orderId: number;
  paymentId: number;
  reason?: string;
  reservationId?: number;
}

export abstract class PaymentEventsScheduler {
  abstract emitPaymentCompleted(
    props: PaymentCompletedProps,
  ): Promise<Result<void, InfrastructureError>>;

  abstract emitPaymentFailed(
    props: PaymentFailedProps,
  ): Promise<Result<void, InfrastructureError>>;
}
