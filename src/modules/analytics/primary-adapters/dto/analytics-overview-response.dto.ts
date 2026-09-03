import { ApiProperty } from '@nestjs/swagger';
import {
  ATTENTION_ORDER_STATUSES,
  type AttentionOrderStatus,
} from '../../core/application/analytics.policy';

export class AnalyticsKpiSnapshotDto {
  @ApiProperty({ type: Number, example: 12500.5 })
  netRevenue!: number;

  @ApiProperty({ type: Number, example: 13000 })
  grossRevenue!: number;

  @ApiProperty({ type: Number, example: 499.5 })
  refundedAmount!: number;

  @ApiProperty({
    type: Number,
    description: 'Orders created in the period (all statuses)',
    example: 48,
  })
  ordersCount!: number;

  @ApiProperty({
    type: Number,
    description:
      'Successful payments in the period (CAPTURED/COMPLETED/PARTIALLY_REFUNDED/REFUNDED); AOV denominator',
    example: 42,
  })
  paidOrderCount!: number;

  @ApiProperty({
    type: Number,
    description: 'netRevenue / paidOrderCount (0 if none)',
    example: 297.63,
  })
  aov!: number;

  @ApiProperty({ type: String, example: 'USD' })
  currency!: string;
}

export class OrderAttentionCountDto {
  @ApiProperty({ enum: ATTENTION_ORDER_STATUSES })
  status!: AttentionOrderStatus;

  @ApiProperty({ type: Number, example: 3 })
  count!: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ type: String, example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty({ type: String, example: '2025-10-01T00:00:00.000Z' })
  from!: string;

  @ApiProperty({ type: String, example: '2025-10-31T23:59:59.999Z' })
  to!: string;

  @ApiProperty({ type: AnalyticsKpiSnapshotDto })
  current!: AnalyticsKpiSnapshotDto;

  @ApiProperty({ type: AnalyticsKpiSnapshotDto })
  previous!: AnalyticsKpiSnapshotDto;

  @ApiProperty({ type: [OrderAttentionCountDto] })
  ordersNeedingAttention!: OrderAttentionCountDto[];

  @ApiProperty({ type: Number, example: 5 })
  lowStockCount!: number;
}
