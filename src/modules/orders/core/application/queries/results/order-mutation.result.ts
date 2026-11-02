import { OrderStatus } from '../../../domain/value-objects/order-status';

/** Slim outbound contract for order status mutations (HTTP, jobs, other adapters). */
export interface OrderMutationResult {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  updatedAt: string;
}
