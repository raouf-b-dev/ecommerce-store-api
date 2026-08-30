/** Overview query including equal-length previous window (computed by the use case). */
export interface AnalyticsOverviewQuery {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}
