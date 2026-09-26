// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { AddressType } from '../../../../../shared-kernel/domain/value-objects/address-type';

export interface IAddress {
  id: number | null;
  userId: number;
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
