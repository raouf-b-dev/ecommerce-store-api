import { AddressType } from '../value-objects/address-type';

export interface IAddress {
  id: string | null;
  customerId: string;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: AddressType;
  isDefault: boolean;
  deliveryInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}
