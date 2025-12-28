// src/modules/products/infrastructure/orm/product.schema.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  sku?: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: numericToNumber })
  price: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
