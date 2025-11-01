// src/modules/orders/domain/interfaces/IOrder.ts
import { OrderStatus } from '../value-objects/order-status';
import {
  ICustomerInfo,
  ICustomerInfoEditable,
} from './customer-info.interface';
import { IOrderItem } from './order-item.interface';
import { IPaymentInfo, IPaymentInfoEditable } from './payment-info.interface';
import {
  IShippingAddress,
  IShippingAddressEditable,
} from './shipping-address.interface';

export interface IOrder extends IOrderEditable {
  id: string;
  customerId: string;
  paymentInfoId: string;
  shippingAddressId: string;
  customerInfo: ICustomerInfo;
  paymentInfo: IPaymentInfo;
  shippingAddress: IShippingAddress;
  subtotal: number;
  shippingCost: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderEditable {
  items: IOrderItem[];
  customerInfo: ICustomerInfoEditable;
  shippingAddress: IShippingAddressEditable;
  paymentInfo: IPaymentInfoEditable;
  customerNotes: string | null;
}
