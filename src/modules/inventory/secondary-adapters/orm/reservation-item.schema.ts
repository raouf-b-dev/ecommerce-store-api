// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ReservationEntity } from './reservation.schema';

@Entity({ name: 'reservation_items' })
@Index('idx_reservation_items_product_id', ['productId'])
export class ReservationItemEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'product_id' })
  productId!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @ManyToOne(() => ReservationEntity, (reservation) => reservation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Relation<ReservationEntity>;
}
