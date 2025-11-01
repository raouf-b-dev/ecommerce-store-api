// src/modules/orders/infrastructure/orm/order-item.schema.ts
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.schema';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';
import { ProductEntity } from '../../../products/infrastructure/orm/product.schema';

@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar', nullable: true })
  productName: string | null;

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

  @ManyToOne(() => ProductEntity, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;
}
