// src/modules/orders/domain/interfaces/order.interface.ts
import { OrderStatus } from '../value-objects/order-status';
import { IOrderItem } from './order-item.interface';
import {
  IShippingAddress,
  IShippingAddressEditable,
} from './shipping-address.interface';
import { PaymentMethodType } from '../../../payments/domain';

export interface IOrder {
  id: string;
  customerId: string;
  paymentId: string | null;
  paymentMethod: PaymentMethodType;
  shippingAddressId: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  customerNotes: string | null;
  subtotal: number;
  shippingCost: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderEditable {
  items: IOrderItem[];
  shippingAddress: IShippingAddressEditable;
  customerNotes: string | null;
}
