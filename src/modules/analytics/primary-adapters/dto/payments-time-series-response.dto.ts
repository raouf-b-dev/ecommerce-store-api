import { ApiProperty } from '@nestjs/swagger';

export class PaymentTimeSeriesBucketDto {
  @ApiProperty({ description: 'UTC bucket start (ISO-8601)' })
  bucketStart!: string;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  refundedAmount!: number;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty()
  capturedCount!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

export class PaymentsTimeSeriesResponseDto {
  @ApiProperty({ example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty({ enum: ['day', 'week'] })
  bucket!: 'day' | 'week';

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: [PaymentTimeSeriesBucketDto] })
  buckets!: PaymentTimeSeriesBucketDto[];
}
