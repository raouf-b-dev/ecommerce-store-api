// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
