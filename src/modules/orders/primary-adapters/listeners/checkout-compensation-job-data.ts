import { isRecord } from '../../../../shared-kernel/infra/lang/is-record';

export interface CheckoutCompensationJobData {
  reservationId?: number;
  orderId?: number;
  paymentId?: number;
  orderTotal?: number;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function parseCheckoutCompensationJobData(
  data: unknown,
): CheckoutCompensationJobData {
  if (!isRecord(data)) {
    return {};
  }

  return {
    reservationId: readOptionalNumber(data.reservationId),
    orderId: readOptionalNumber(data.orderId),
    paymentId: readOptionalNumber(data.paymentId),
    orderTotal: readOptionalNumber(data.orderTotal),
  };
}
