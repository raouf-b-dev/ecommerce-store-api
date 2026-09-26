// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { IAddress } from './address.interface';

export interface IUser {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}
