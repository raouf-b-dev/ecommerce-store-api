import type { AnalyticsPeriodQuery } from './analytics-period.query';

export interface TopProductsQuery extends AnalyticsPeriodQuery {
  limit: number;
}
