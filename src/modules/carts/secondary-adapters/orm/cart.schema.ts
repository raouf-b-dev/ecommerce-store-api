// src/modules/carts/infrastructure/orm/cart.schema.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { CartItemEntity } from './cart-item.schema';

@Entity({ name: 'carts' })
@Index('idx_carts_user_id', ['userId'])
@Index('idx_carts_session_id', ['sessionId'])
export class CartEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'session_id', type: 'int', nullable: true })
  sessionId: number | null;

  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items: Relation<CartItemEntity>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
