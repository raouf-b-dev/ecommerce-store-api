export interface ICustomerInfo extends ICustomerInfoEditable {
  customerId: string;
}

export interface ICustomerInfoEditable {
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
}
