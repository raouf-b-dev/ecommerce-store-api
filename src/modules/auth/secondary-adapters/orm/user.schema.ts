import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.schema';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ name: 'role_id', nullable: true }) // nullable temporarily to avoid migration failures on existing dev db
  roleId: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToOne(() => RoleEntity, { eager: false })
  @JoinColumn({ name: 'role_id' })
  roleEntity: RoleEntity | null;

  @Column({ type: 'text', nullable: true })
  customerId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
