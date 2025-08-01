import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IOrder } from '../../domain/interfaces/IOrder';

@Entity({ name: 'orders' })
export class OrderEntity implements IOrder {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  totalPrice: number;
}
