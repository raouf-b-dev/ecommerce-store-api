import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

// Downstream-specific DTO — Orders never sees the full Customer entity
export interface CheckoutCustomerAddress {
  id: number | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  deliveryInstructions: string | null;
}

export interface CheckoutCustomerInfo {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addresses: CheckoutCustomerAddress[];
}

export abstract class CustomerGateway {
  abstract validateCustomer(
    userId: number,
  ): Promise<Result<CheckoutCustomerInfo, InfrastructureError>>;
}
