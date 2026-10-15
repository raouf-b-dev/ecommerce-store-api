// src/modules/carts/infrastructure/orm/cart-item.schema.ts
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { CartEntity } from './cart.schema';
import { numericToNumber } from '../../../../infrastructure/database/number.transformer';

@Entity({ name: 'cart_items' })
export class CartItemEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar' })
  productName!: string;

  @Column({
    type: 'numeric',
    precision: 13,
    scale: 3,
    transformer: numericToNumber,
  })
  price!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @ManyToOne(() => CartEntity, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart!: Relation<CartEntity>;
}
