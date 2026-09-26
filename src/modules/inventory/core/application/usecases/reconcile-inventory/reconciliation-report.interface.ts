// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
