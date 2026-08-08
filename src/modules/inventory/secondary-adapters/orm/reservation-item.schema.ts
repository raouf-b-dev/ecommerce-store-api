import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ReservationEntity } from './reservation.schema';

@Entity({ name: 'reservation_items' })
@Index('idx_reservation_items_product_id', ['productId'])
export class ReservationItemEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => ReservationEntity, (reservation) => reservation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Relation<ReservationEntity>;
}
