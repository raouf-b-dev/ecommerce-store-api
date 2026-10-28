import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class PaymentListItemResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: Number, example: 42 })
  orderId!: number;

  @ApiProperty({ type: Number, example: 3 })
  userId!: number;

  @ApiProperty({
    type: String,
    example: 'Jane Doe',
    description:
      "Customer display name. Without view_customer_pii (and not the payment owner) this is the placeholder 'Customer #<userId>'.",
  })
  userName!: string;

  @ApiProperty({
    type: String,
    example: 'customer@store.local',
    description:
      "Customer email. Without view_customer_pii (and not the owner) this is a masked placeholder such as 'j***@***.com'.",
  })
  userEmail!: string;

  @ApiProperty({
    type: Number,
    example: 224.94,
    description: 'Payment amount as a major-unit decimal',
  })
  amount!: number;

  @ApiProperty({ type: String, example: 'USD' })
  currency!: string;

  @ApiProperty({ type: String, example: 'completed' })
  status!: string;

  @ApiProperty({
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD,
  })
  paymentMethod!: PaymentMethodType;

  @ApiProperty({ type: String, example: 'txn_123' })
  transactionId!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-10-31T12:30:00.000Z',
  })
  createdAt!: string;
}

export class PaginatedPaymentListResponseDto {
  @ApiProperty({ type: [PaymentListItemResponseDto] })
  items!: PaymentListItemResponseDto[];

  @ApiProperty({ type: Number, example: 15 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 10 })
  limit!: number;

  @ApiProperty({ type: Number, example: 2 })
  totalPages!: number;
}
