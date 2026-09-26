// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
