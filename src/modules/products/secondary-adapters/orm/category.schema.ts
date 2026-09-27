import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'categories' })
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_active', ['isActive'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
