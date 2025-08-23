// src/modules/products/infrastructure/orm/product.schema.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { IProduct } from '../../domain/interfaces/IProduct';

@Entity({ name: 'products' })
export class ProductEntity implements IProduct {
  @PrimaryColumn('varchar')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  sku?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column('int')
  stockQuantity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
