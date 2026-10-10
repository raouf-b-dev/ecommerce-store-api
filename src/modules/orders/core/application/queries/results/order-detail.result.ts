import { PaymentMethodType } from 'src/shared-kernel/domain/value-objects/payment-method';
import { OrderItemDetailDTO } from './order-item-detail.result';

export interface OrderDetailDTO {
  id: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  paymentMethod: PaymentMethodType;
  shippingAddress: string;
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
