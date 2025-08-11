import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IProduct } from '../../domain/interfaces/IProduct';

@Entity({ name: 'products' })
export class ProductEntity implements IProduct {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
}
