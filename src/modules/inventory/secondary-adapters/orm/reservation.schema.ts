// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { ReservationStatus } from '../../core/domain/value-objects/reservation-status';
import { ReservationItemEntity } from './reservation-item.schema';

@Entity({ name: 'reservations' })
@Index('idx_reservations_order_id', ['orderId'])
@Index('idx_reservations_status_expires_at', ['status', 'expiresAt'])
@Index('idx_reservations_pending_status', ['status'], {
  where: '"status" = \'PENDING\'',
})
export class ReservationEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @Column({
    type: 'varchar',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(
    () => ReservationItemEntity,
    (item: ReservationItemEntity) => item.reservation,
    {
      cascade: true,
      eager: true,
    },
  )
  items!: Relation<ReservationItemEntity>[];
}
