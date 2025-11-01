// src/modules/orders/infrastructure/orm/payment-info.schema.ts
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../domain/value-objects/payment-status';
import { numericToNumber } from '../../../../core/infrastructure/database/number.transformer';

@Entity({ name: 'payment_info' })
@Index('idx_payment_info_status', ['status'])
@Index('idx_payment_info_method', ['method'])
export class PaymentInfoEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({
    type: 'varchar',
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
  })
  method: PaymentMethod;

  @Column({
    type: 'varchar',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  transactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
