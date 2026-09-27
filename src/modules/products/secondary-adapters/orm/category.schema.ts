// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'categories' })
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_active', ['isActive'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
