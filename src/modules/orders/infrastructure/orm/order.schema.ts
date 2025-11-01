// src/modules/orders/infrastructure/orm/order.schema.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItemEntity } from './order-item.schema';
import { CustomerInfoEntity } from './customer-info.schema';
import { ShippingAddressEntity } from './shipping-address.schema';
import { PaymentInfoEntity } from './payment-info.schema';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';
import { OrderStatus } from '../../domain/value-objects/order-status';

@Entity({ name: 'orders' })
@Index('idx_orders_created_at_desc', ['createdAt'])
@Index('idx_orders_updated_at_desc', ['updatedAt'])
@Index('idx_orders_total_price_desc', ['totalPrice'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_customer_id', ['customerId'])
@Index('idx_orders_customer_created', ['customerId', 'createdAt'])
@Index('idx_orders_customer_status', ['customerId', 'status'])
@Index('idx_orders_status_created', ['status', 'createdAt'])
@Index('idx_orders_customer_status_created', [
  'customerId',
  'status',
  'createdAt',
])
@Index('idx_orders_status_total_price', ['status', 'totalPrice'])
export class OrderEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'shipping_address_id' })
  shippingAddressId: string;

  @Column({ name: 'payment_info_id' })
  paymentInfoId: string;

  // Relations
  @OneToOne(() => CustomerInfoEntity, {
    cascade: true,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'customerId' })
  customerInfo: CustomerInfoEntity;

  @OneToMany(() => OrderItemEntity, (item: OrderItemEntity) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItemEntity[];

  @OneToOne(() => ShippingAddressEntity, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: ShippingAddressEntity;

  @OneToOne(() => PaymentInfoEntity, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_info_id' })
  paymentInfo: PaymentInfoEntity;

  @Column({ type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  subtotal: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  shippingCost: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  totalPrice: number;

  @Column({
    type: 'varchar',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
