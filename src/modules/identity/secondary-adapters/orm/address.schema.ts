import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { AddressType } from '../../../../shared-kernel/domain/value-objects/address-type';
import { UserEntity } from './user.schema';

@Entity({ name: 'user_addresses' })
export class AddressEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar' })
  street!: string;

  @Column({ type: 'varchar', nullable: true })
  street2!: string | null;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  state!: string;

  @Column({ name: 'postal_code', type: 'varchar' })
  postalCode!: string;

  @Column({ type: 'varchar' })
  country!: string;

  @Column({ type: 'enum', enum: AddressType })
  type!: AddressType;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'delivery_instructions', type: 'text', nullable: true })
  deliveryInstructions!: string | null;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, (user) => user.addresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserEntity>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
