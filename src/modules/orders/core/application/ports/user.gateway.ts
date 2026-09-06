import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';

// Downstream-specific DTO - Orders never sees the full User entity
export interface CheckoutUserAddress {
  id: number | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type?: AddressType;
  deliveryInstructions: string | null;
}

export interface CheckoutUserInfoResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addresses: CheckoutUserAddress[];
}

export abstract class UserGateway {
  abstract getUserInfo(
    userId: number,
  ): Promise<Result<CheckoutUserInfoResult, InfrastructureError>>;
}
