// src/modules/orders/infrastructure/orm/customer-info.schema.ts
import { Column, Entity, PrimaryColumn, Index } from 'typeorm';
import { ICustomerInfo } from '../../domain/interfaces/ICustomerInfo';

@Entity({ name: 'customer_info' })
@Index('idx_customer_info_email', ['email'])
@Index('idx_customer_info_name', ['firstName', 'lastName'])
export class CustomerInfoEntity implements ICustomerInfo {
  @PrimaryColumn('varchar')
  customerId: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;
}
