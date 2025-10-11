// src/modules/orders/infrastructure/orm/shipping-address.schema.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'shipping_addresses' })
export class ShippingAddressEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' })
  street: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar' })
  state: string;

  @Column({ type: 'varchar' })
  postalCode: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;
}
