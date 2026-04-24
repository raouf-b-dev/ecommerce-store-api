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
  id: string;

  @Index()
  @Column()
  userId: number;

  @Column()
  tokenHash: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
