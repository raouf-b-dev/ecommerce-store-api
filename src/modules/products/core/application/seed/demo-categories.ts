export interface DemoSeedCategory {
  /** Documentation only. Migration inserts ids 1-5; later rows are seed-only. Runtime identity is slug. */
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export const DEMO_SEED_CATEGORIES: DemoSeedCategory[] = [
  {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    description: null,
  },
  {
    id: 2,
    name: 'Clothing',
    slug: 'clothing',
    description: null,
  },
  {
    id: 3,
    name: 'Home & Garden',
    slug: 'home-garden',
    description: null,
  },
  {
    id: 4,
    name: 'Sports',
    slug: 'sports',
    description: null,
  },
  {
    id: 5,
    name: 'Books',
    slug: 'books',
    description: null,
  },
  {
    id: 6,
    name: 'Beauty',
    slug: 'beauty',
    description: null,
  },
  {
    id: 7,
    name: 'Outdoors',
    slug: 'outdoors',
    description: null,
  },
];
