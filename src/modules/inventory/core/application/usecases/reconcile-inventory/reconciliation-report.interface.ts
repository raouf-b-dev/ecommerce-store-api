export interface InventoryDiscrepancy {
  productId: number;
  type: 'reservation_drift';
  expected: number;
  actual: number;
}

export interface ReconciliationReport {
  totalChecked: number;
  discrepancyCount: number;
  discrepancies: InventoryDiscrepancy[];
  durationMs: number;
  checkedAt: Date;
}
