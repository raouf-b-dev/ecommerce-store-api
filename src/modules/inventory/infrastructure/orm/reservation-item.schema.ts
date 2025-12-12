import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReservationEntity } from './reservation.schema';

@Entity({ name: 'reservation_items' })
export class ReservationItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => ReservationEntity, (reservation) => reservation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: ReservationEntity;
}
