import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsPeriodQueryDto } from './analytics-period-query.dto';
import {
  ANALYTICS_BUCKETS,
  type AnalyticsBucket,
} from '../../core/application/analytics.policy';

export class PaymentsTimeSeriesQueryDto extends AnalyticsPeriodQueryDto {
  @IsIn([...ANALYTICS_BUCKETS])
  @ApiProperty({
    enum: ANALYTICS_BUCKETS,
    description: 'UTC bucket size (whitelist only)',
    example: 'day',
  })
  bucket!: AnalyticsBucket;
}
