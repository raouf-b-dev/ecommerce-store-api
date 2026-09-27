import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Payment read model for GET /payments/orders/:orderId (and similar detail reads). */
export class PaymentDetailResponseDto {
  @ApiProperty({ example: 1, description: 'Payment ID' })
  id!: number;

  @ApiProperty({ example: 1, description: 'Order ID' })
  orderId!: number;

  @ApiProperty({ example: 3, description: 'Customer user ID' })
  userId!: number;

  @ApiProperty({ example: 'Jane Doe', description: 'Customer display name' })
  userName!: string;

  @ApiProperty({
    example: 'customer@store.local',
    description: 'Customer email',
  })
  userEmail!: string;

  @ApiProperty({ example: 224.94, description: 'Payment amount' })
  amount!: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency!: string;

  @ApiProperty({ example: 'completed', description: 'Payment status' })
  status!: string;

  @ApiProperty({ example: 'stripe', description: 'Payment method' })
  paymentMethod!: string;

  @ApiProperty({ example: 'txn_123', description: 'Transaction ID' })
  transactionId!: string;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Payment creation date',
  })
  createdAt!: string;

  @ApiPropertyOptional({
    example: 'pi_123',
    description: 'Gateway payment intent ID',
    nullable: true,
    type: String,
  })
  gatewayPaymentIntentId!: string | null;

  @ApiPropertyOptional({
    example: 'Card declined',
    description: 'Failure reason if payment failed',
    nullable: true,
    type: String,
  })
  failureReason?: string | null;

  @ApiPropertyOptional({
    description: 'Gateway metadata',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    example: '2025-10-31T12:35:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: string;
}
