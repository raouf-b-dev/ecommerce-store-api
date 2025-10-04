export interface IShippingAddress extends IShippingAddressEditable {
  id: string;
}
export interface IShippingAddressEditable {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}
