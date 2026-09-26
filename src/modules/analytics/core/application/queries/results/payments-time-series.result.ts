// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface PaymentTimeSeriesBucket {
  bucketStart: string;
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
  capturedCount: number;
  currency: string;
}

export interface PaymentsTimeSeriesResult {
  timezone: 'UTC';
  bucket: 'day' | 'week';
  from: string;
  to: string;
  buckets: PaymentTimeSeriesBucket[];
}
