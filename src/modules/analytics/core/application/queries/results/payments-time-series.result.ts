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
