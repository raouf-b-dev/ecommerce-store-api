// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/carts/infrastructure/orm/cart.schema.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
  VersionColumn,
} from 'typeorm';
import { CartItemEntity } from './cart-item.schema';

@Entity({ name: 'carts' })
@Index('idx_carts_user_id', ['userId'])
export class CartEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'user_id', type: 'int', nullable: false, unique: true })
  userId!: number;

  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items!: Relation<CartItemEntity>[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
