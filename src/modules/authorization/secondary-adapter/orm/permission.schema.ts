// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;
}
