// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
