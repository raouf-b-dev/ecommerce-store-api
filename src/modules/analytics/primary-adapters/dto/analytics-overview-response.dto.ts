import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../orders/core/domain/value-objects/order-status';

export class AnalyticsKpiSnapshotDto {
  @ApiProperty()
  netRevenue!: number;

  @ApiProperty()
  grossRevenue!: number;

  @ApiProperty()
  refundedAmount!: number;

  @ApiProperty({ description: 'Orders created in the period (all statuses)' })
  ordersCount!: number;

  @ApiProperty({
    description:
      'Successful payments in the period (CAPTURED/COMPLETED/PARTIALLY_REFUNDED/REFUNDED); AOV denominator',
  })
  paidOrderCount!: number;

  @ApiProperty({ description: 'netRevenue / paidOrderCount (0 if none)' })
  aov!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

export class OrderAttentionCountDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  count!: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: AnalyticsKpiSnapshotDto })
  current!: AnalyticsKpiSnapshotDto;

  @ApiProperty({ type: AnalyticsKpiSnapshotDto })
  previous!: AnalyticsKpiSnapshotDto;

  @ApiProperty({ type: [OrderAttentionCountDto] })
  ordersNeedingAttention!: OrderAttentionCountDto[];

  @ApiProperty()
  lowStockCount!: number;
}
