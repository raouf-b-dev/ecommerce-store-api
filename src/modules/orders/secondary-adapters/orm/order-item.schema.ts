// src/modules/orders/infrastructure/orm/order-item.schema.ts
import {
  Check,
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
@Check('CHK_order_items_product_name_not_blank', `btrim("product_name") <> ''`)
@Index('idx_order_items_product_id', ['productId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ type: 'varchar', name: 'product_name' })
  productName!: string;

  @Column({ type: 'varchar', nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({
    type: 'numeric',
    precision: 13,
    scale: 3,
    transformer: numericToNumber,
  })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 13,
    scale: 3,
    transformer: numericToNumber,
  })
  lineTotal!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @ManyToOne(() => OrderEntity, (order: OrderEntity) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Relation<OrderEntity>;
}
