// src/modules/orders/infrastructure/orm/order.schema.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Relation,
  VersionColumn,
} from 'typeorm';
import { OrderItemEntity } from './order-item.schema';
import { ShippingAddressEntity } from './shipping-address.schema';
import { numericToNumber } from '../../../../infrastructure/database/number.transformer';
import { OrderStatus } from '../../core/domain/value-objects/order-status';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

@Entity({ name: 'orders' })
@Index('idx_orders_status', ['status'])
@Index('idx_orders_user_id', ['userId'])
@Index('idx_orders_payment_id', ['paymentId'])
@Index('idx_orders_user_status', ['userId', 'status'])
export class OrderEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'payment_id', type: 'int', nullable: true })
  paymentId!: number | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
  })
  paymentMethod!: PaymentMethodType;

  @Column({ name: 'shipping_address_id' })
  shippingAddressId!: number;

  // Relations
  @OneToMany(() => OrderItemEntity, (item: OrderItemEntity) => item.order, {
    cascade: true,
    eager: true,
  })
  items!: Relation<OrderItemEntity>[];

  @OneToOne(() => ShippingAddressEntity, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress!: ShippingAddressEntity;

  @Column({ type: 'text', nullable: true })
  userNotes!: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  subtotal!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  shippingCost!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  totalPrice!: number;

  @Column({
    type: 'varchar',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status!: OrderStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
