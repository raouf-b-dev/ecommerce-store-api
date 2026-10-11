import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class OrderPaymentResponseDto {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 123 })
  orderId!: number;

  @ApiProperty({
    example: 299.99,
    description: 'Payment amount as a major-unit decimal',
    type: Number,
  })
  amount!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  paymentMethod!: PaymentMethodType;

  @ApiProperty({ example: 'AUTHORIZED' })
  status!: string;

  @ApiPropertyOptional({ example: 'txn_1234567890' })
  transactionId!: string | null;

  @ApiPropertyOptional({
    example: 'pi_1234567890',
    description: 'Gateway payment intent ID',
    nullable: true,
    type: String,
  })
  gatewayPaymentIntentId!: string | null;

  @ApiPropertyOptional({ example: 123 })
  userId!: number | null;

  @ApiPropertyOptional({ example: '**** 1234' })
  paymentMethodInfo!: string | null;

  @ApiProperty({
    example: 50,
    description: 'Refunded amount as a major-unit decimal',
    type: Number,
  })
  refundedAmount!: number;

  @ApiPropertyOptional({ example: 'Payment gateway error' })
  failureReason!: string | null;

  @ApiProperty({ example: '2025-10-31T10:00:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2025-10-31T10:05:00Z' })
  completedAt!: Date | null;

  @ApiProperty({ example: '2025-10-31T12:30:00Z' })
  updatedAt!: Date;
}
