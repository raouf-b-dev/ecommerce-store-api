import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ShippingAddressProps } from '../value-objects/shipping-address';

export interface ScheduleCheckoutProps {
  cartId: number;
  userId: number;
  shippingAddress: ShippingAddressProps;
  customerNotes?: string;
  orderId: number;
  flowId: string;
}

export interface SchedulePostPaymentProps {
  orderId: number;
  reservationId: number;
  cartId: number;
}

/**
 * Schedule a refund for either an explicit major-unit amount (cancel
 * path), or the payment's remaining balance (surplus path).
 */
export type ScheduleRefundPaymentProps = {
  orderId: number;
  paymentId: number;
  reason: string;
} & ({ amount: number } | { mode: 'remaining' });

export abstract class OrderScheduler {
  abstract scheduleCheckout(
    props: ScheduleCheckoutProps,
  ): Promise<Result<string, InfrastructureError>>;

  abstract schedulePostPayment(
    orderId: number,
    reservationId: number,
    cartId: number,
  ): Promise<Result<string, InfrastructureError>>;

  abstract scheduleStockRelease(
    reservationId: number,
  ): Promise<Result<string, InfrastructureError>>;

  abstract scheduleOrderStockRelease(
    orderId: number,
  ): Promise<Result<string, InfrastructureError>>;

  abstract scheduleRefundPayment(
    props: ScheduleRefundPaymentProps,
  ): Promise<Result<string, InfrastructureError>>;

  abstract schedulePendingOrdersExpiration(): Promise<
    Result<string, InfrastructureError>
  >;
}
