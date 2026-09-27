import { ApiProperty } from '@nestjs/swagger';

export class PaymentListItemResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: Number, example: 42 })
  orderId!: number;

  @ApiProperty({ type: Number, example: 3 })
  userId!: number;

  @ApiProperty({ type: String, example: 'Jane Doe' })
  userName!: string;

  @ApiProperty({ type: String, example: 'customer@store.local' })
  userEmail!: string;

  @ApiProperty({ type: Number, example: 224.94 })
  amount!: number;

  @ApiProperty({ type: String, example: 'USD' })
  currency!: string;

  @ApiProperty({ type: String, example: 'completed' })
  status!: string;

  @ApiProperty({ type: String, example: 'stripe' })
  paymentMethod!: string;

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
