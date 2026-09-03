import { ApiProperty } from '@nestjs/swagger';

export class PaymentTimeSeriesBucketDto {
  @ApiProperty({
    type: String,
    description: 'UTC bucket start (ISO-8601)',
    example: '2025-10-01T00:00:00.000Z',
  })
  bucketStart!: string;

  @ApiProperty({ type: Number, example: 1500.25 })
  grossAmount!: number;

  @ApiProperty({ type: Number, example: 50 })
  refundedAmount!: number;

  @ApiProperty({ type: Number, example: 1450.25 })
  netAmount!: number;

  @ApiProperty({ type: Number, example: 12 })
  capturedCount!: number;

  @ApiProperty({ type: String, example: 'USD' })
  currency!: string;
}

export class PaymentsTimeSeriesResponseDto {
  @ApiProperty({ type: String, example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty({ enum: ['day', 'week'], example: 'day' })
  bucket!: 'day' | 'week';

  @ApiProperty({ type: String, example: '2025-10-01T00:00:00.000Z' })
  from!: string;

  @ApiProperty({ type: String, example: '2025-10-31T23:59:59.999Z' })
  to!: string;

  @ApiProperty({ type: [PaymentTimeSeriesBucketDto] })
  buckets!: PaymentTimeSeriesBucketDto[];
}
