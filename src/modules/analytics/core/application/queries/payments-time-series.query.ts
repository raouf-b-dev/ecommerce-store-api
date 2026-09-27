// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import type { AnalyticsBucket } from '../analytics.policy';
import type { AnalyticsPeriodQuery } from './analytics-period.query';

export interface PaymentsTimeSeriesQuery extends AnalyticsPeriodQuery {
  bucket: AnalyticsBucket;
}
