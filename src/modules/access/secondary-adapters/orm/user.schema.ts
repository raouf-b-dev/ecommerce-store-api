import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RoleEntity } from './role.schema';
import { AddressEntity } from './address.schema';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ name: 'role_id' })
  roleId: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToOne(() => RoleEntity, { eager: false })
  @JoinColumn({ name: 'role_id' })
  roleEntity: RoleEntity;

  @OneToMany(() => AddressEntity, (address) => address.user, { cascade: true })
  addresses: AddressEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
