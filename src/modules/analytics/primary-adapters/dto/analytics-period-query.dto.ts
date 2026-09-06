import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsAnalyticsPeriodRange } from './analytics-period-range.validator';
import { ANALYTICS_MAX_RANGE_DAYS } from '../../core/application/analytics.policy';

export class AnalyticsPeriodQueryDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Period start (inclusive), ISO-8601. Buckets use UTC.',
    example: '2026-08-01T00:00:00.000Z',
  })
  from!: string;

  @IsDateString()
  @IsNotEmpty()
  @IsAnalyticsPeriodRange()
  @ApiProperty({
    description: `Period end (inclusive bound for filtering), ISO-8601. Max span ${ANALYTICS_MAX_RANGE_DAYS} days from \`from\`.`,
    example: '2026-08-30T23:59:59.999Z',
  })
  to!: string;
}
