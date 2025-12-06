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
import { ShippingAddressEntity } from './shipping-address.schema';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethodType } from '../../../payments/domain';

@Entity({ name: 'orders' })
@Index('idx_orders_created_at_desc', ['createdAt'])
@Index('idx_orders_updated_at_desc', ['updatedAt'])
@Index('idx_orders_total_price_desc', ['totalPrice'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_customer_id', ['customerId'])
@Index('idx_orders_payment_id', ['paymentId'])
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

  @Column({ name: 'payment_id', type: 'varchar', nullable: true })
  paymentId: string | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
  })
  paymentMethod: PaymentMethodType;

  @Column({ name: 'shipping_address_id' })
  shippingAddressId: string;

  // Relations
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
