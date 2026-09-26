// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('session_tokens')
export class SessionTokenEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: number;

  @Column()
  tokenHash!: string;

  @Column()
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
