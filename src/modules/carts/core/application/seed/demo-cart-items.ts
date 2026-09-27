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
