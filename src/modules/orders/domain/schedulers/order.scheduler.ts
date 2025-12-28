import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { PaymentMethodType } from '../../../payments/domain';
import { ShippingAddressProps } from '../value-objects/shipping-address';

export interface ScheduleCheckoutProps {
  cartId: number;
  userId: number;
  shippingAddress: ShippingAddressProps;
  paymentMethod: PaymentMethodType;
  customerNotes?: string;
  orderId: number;
}

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

  abstract schedulePostConfirmation(
    orderId: number,
    reservationId: number,
    cartId: number,
  ): Promise<Result<string, InfrastructureError>>;

  abstract scheduleOrderStockRelease(
    orderId: number,
  ): Promise<Result<string, InfrastructureError>>;
}
