// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ReservationStatus } from '../value-objects/reservation-status';
import { IReservationItem } from './reservation-item.interface';

export interface IReservation {
  id: number | null;
  orderId: number;
  items: IReservationItem[];
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
