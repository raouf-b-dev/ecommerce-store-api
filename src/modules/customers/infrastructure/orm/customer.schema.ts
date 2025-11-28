import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AddressEntity } from './address.schema';

@Entity({ name: 'customers' })
export class CustomerEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number;

  @Column({ name: 'total_spent', type: 'float', default: 0 })
  totalSpent: number;

  @OneToMany(() => AddressEntity, (address) => address.customer, {
    cascade: true,
    eager: true,
  })
  addresses: AddressEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
