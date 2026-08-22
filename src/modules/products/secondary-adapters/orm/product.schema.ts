// src/modules/products/infrastructure/orm/product.schema.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { numericToNumber } from '../../../../infrastructure/database/number.transformer';

@Entity({ name: 'products' })
@Index('idx_products_slug', ['slug'], { unique: true })
@Index('idx_products_category_id', ['categoryId'])
@Index('idx_products_active', ['isActive'], { where: '"is_active" = true' })
@Index('idx_products_category_active', ['categoryId', 'isActive'], {
  where: '"is_active" = true',
})
export class ProductEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column()
  name!: string;

  @Column({ default: '' })
  slug!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  sku?: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: numericToNumber })
  price!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ nullable: true, name: 'category_id', type: 'int' })
  categoryId?: number;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
