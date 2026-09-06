// src/modules/orders/infrastructure/orm/order-item.schema.ts
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Relation,
} from 'typeorm';
import { OrderEntity } from './order.schema';
import { numericToNumber } from '../../../../infrastructure/database/number.transformer';

@Entity({ name: 'order_items' })
@Index('idx_order_items_product_id', ['productId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ type: 'varchar', name: 'product_name', default: '' })
  productName!: string;

  @Column({ type: 'varchar', nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  lineTotal!: number;

  @ManyToOne(() => OrderEntity, (order: OrderEntity) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Relation<OrderEntity>;
}
