export interface ICustomerInfo extends ICustomerInfoEditable {
  customerId: string;
}

export interface ICustomerInfoEditable {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
}
