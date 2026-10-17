import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderItemDetailDTO } from './order-item-detail.result';

export interface OrderDetailDTO {
  id: number;
  orderNumber: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  status: string;
  paymentMethod: PaymentMethodType;
  shippingAddress: string | null;
  items: OrderItemDetailDTO[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  totalPrice: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDetailResult = OrderDetailDTO;
