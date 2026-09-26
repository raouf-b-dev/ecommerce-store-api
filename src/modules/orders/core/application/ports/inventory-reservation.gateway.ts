// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface ReservationData {
  id: number | null;
}

export interface ReserveStockItem {
  productId: number;
  quantity: number;
}

export interface ReserveStockInput {
  orderId: number;
  items: ReserveStockItem[];
}

export abstract class InventoryReservationGateway {
  abstract getOrderReservations(
    orderId: number,
  ): Promise<Result<ReservationData[], InfrastructureError>>;

  abstract reserveStock(
    input: ReserveStockInput,
  ): Promise<Result<ReservationData, InfrastructureError>>;

  abstract releaseStock(
    reservationId: number,
  ): Promise<Result<void, InfrastructureError>>;

  abstract confirmReservation(
    reservationId: number,
  ): Promise<Result<void, InfrastructureError>>;
}
