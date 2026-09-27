// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import type { AnalyticsPeriodQuery } from './analytics-period.query';

export interface TopProductsQuery extends AnalyticsPeriodQuery {
  limit: number;
}
