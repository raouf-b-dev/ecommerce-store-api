// src/modules/orders/infrastructure/orm/order-item.schema.ts
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.schema';
import { IOrderItem } from '../../domain/interfaces/IOrderItem';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';

@Entity({ name: 'order_items' })
export class OrderItemEntity implements IOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar', nullable: true })
  productName?: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  lineTotal: number;

  @ManyToOne(() => OrderEntity, (order: OrderEntity) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
}
