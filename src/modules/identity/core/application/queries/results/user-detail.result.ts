// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { AddressType } from '../../../../../../shared-kernel/domain/value-objects/address-type';
import { UserListItemDTO } from './user-list-item.result';

export interface UserAddressDTO {
  id: number;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: AddressType;
  isDefault: boolean;
  deliveryInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetailDTO extends UserListItemDTO {
  addressCount: number;
  addresses: UserAddressDTO[];
  updatedAt: string;
}
