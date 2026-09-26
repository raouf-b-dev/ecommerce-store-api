// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface AnalyticsKpiSnapshot {
  netRevenue: number;
  grossRevenue: number;
  refundedAmount: number;
  ordersCount: number;
  /** Count of successful payments in the period (AOV denominator). */
  paidOrderCount: number;
  aov: number;
  currency: string;
}

export interface OrderAttentionCount {
  /** Persisted order status string (e.g. pending_payment). */
  status: string;
  count: number;
}

export interface AnalyticsOverviewResult {
  timezone: 'UTC';
  from: string;
  to: string;
  current: AnalyticsKpiSnapshot;
  previous: AnalyticsKpiSnapshot;
  ordersNeedingAttention: OrderAttentionCount[];
  lowStockCount: number;
}
