// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Reservation } from '../entities/reservation';

export interface ReservationItemInput {
  productId: number;
  quantity: number;
}

export interface ReservationInput {
  orderId: number;
  items: ReservationItemInput[];
}
export abstract class ReservationRepository {
  abstract save(
    dto: ReservationInput,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findById(id: number): Promise<Result<Reservation, RepositoryError>>;
  abstract findByOrderId(
    orderId: number,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findAllByOrderId(
    orderId: number,
  ): Promise<Result<Reservation[], RepositoryError>>;
  abstract update(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract findPendingExpired(
    date: Date,
  ): Promise<Result<Reservation[], RepositoryError>>;
  abstract release(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract confirm(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>>;
  abstract sumPendingReservedByProductIds(
    productIds: number[],
    asOfDate?: Date,
  ): Promise<Result<Map<number, number>, RepositoryError>>;
}
