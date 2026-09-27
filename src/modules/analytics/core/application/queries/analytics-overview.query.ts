// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

/** Overview query including equal-length previous window (computed by the use case). */
export interface AnalyticsOverviewQuery {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}
