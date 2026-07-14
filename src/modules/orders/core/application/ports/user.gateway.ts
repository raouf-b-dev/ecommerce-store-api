import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';

// Downstream-specific DTO — Orders never sees the full User entity
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
  id: number | null;
  passwordHash: string;
  roleId: number;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addresses: CheckoutUserAddress[];
}

export interface CheckoutUserInfoInput {
  passwordHash: string;
  roleId: number;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export abstract class UserGateway {
  abstract createUser(
    input: CheckoutUserInfoResult,
  ): Promise<Result<CheckoutUserInfoResult, InfrastructureError>>;
  abstract validateUser(
    userId: number,
  ): Promise<Result<CheckoutUserInfoResult, InfrastructureError>>;
}
