import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'inventory' })
@Index(['productId'], { unique: true })
@Index(['availableQuantity'])
export class InventoryEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ type: 'int' })
  availableQuantity: number;

  @Column({ type: 'int' })
  reservedQuantity: number;

  @Column({ type: 'int' })
  totalQuantity: number;

  @Column({ type: 'int' })
  lowStockThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRestockDate: Date | null;
}
