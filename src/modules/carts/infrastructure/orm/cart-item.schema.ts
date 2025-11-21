// src/modules/carts/infrastructure/orm/cart-item.schema.ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CartEntity } from './cart.schema';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';

@Entity({ name: 'cart_items' })
export class CartItemEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @ManyToOne(() => CartEntity, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: CartEntity;
}
