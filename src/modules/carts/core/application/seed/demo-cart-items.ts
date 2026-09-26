// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface DemoSeedCartItem {
  sku: string;
  quantity: number;
}

export const DEMO_SEED_CART_ITEMS: DemoSeedCartItem[] = [
  {
    sku: 'ELEC-ANC-001',
    quantity: 1,
  },
  {
    sku: 'CLOT-OCH-001',
    quantity: 2,
  },
  {
    sku: 'HOME-SFP-002',
    quantity: 1,
  },
];
