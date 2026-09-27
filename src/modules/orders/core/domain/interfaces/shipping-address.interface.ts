export interface IShippingAddress extends IShippingAddressEditable {
  id: number | null;
}
export interface IShippingAddressEditable {
  firstName: string;
  lastName: string;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  deliveryInstructions: string | null;
}
