// src/modules/customers/domain/interfaces/customer.interface.ts

import { IAddress } from './address.interface';

export interface ICustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addresses: IAddress[];
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}
