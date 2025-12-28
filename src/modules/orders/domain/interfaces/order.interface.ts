// src/modules/orders/domain/interfaces/order.interface.ts
import { OrderStatus } from '../value-objects/order-status';
import { IOrderItem } from './order-item.interface';
import {
  IShippingAddress,
  IShippingAddressEditable,
} from './shipping-address.interface';
import { PaymentMethodType } from '../../../payments/domain';

export interface IOrder {
  id: number | null;
  customerId: number;
  paymentId: number | null;
  paymentMethod: PaymentMethodType;
  shippingAddressId: number | null;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  customerNotes: string | null;
  subtotal: number;
  shippingCost: number;
  totalPrice: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderEditable {
  items: IOrderItem[];
  shippingAddress: IShippingAddressEditable;
  customerNotes: string | null;
}
