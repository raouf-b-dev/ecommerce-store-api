import { OrderStatus } from '../../../domain/value-objects/order-status';

export interface CheckoutResult {
  orderId: number;
  jobId: string;
  status: OrderStatus;
  message: string;
}
