import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { RoleEntity } from './role.schema';

@Entity('user_role_assignments')
@Unique(['userId'])
export class UserRoleAssignmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number; // opaque reference to Identity's User.id — no FK, no relation

  @Column({ name: 'role_id' })
  roleId!: number;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Relation<RoleEntity>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
