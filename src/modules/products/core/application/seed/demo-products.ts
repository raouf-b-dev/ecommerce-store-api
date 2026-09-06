export interface DemoSeedProduct {
  name: string;
  description: string;
  sku: string;
  price: number;
  categorySlug: string;
  initialStock: number;
  lowStockThreshold: number;
}

export const DEMO_SEED_PRODUCTS: DemoSeedProduct[] = [
  {
    name: 'Wireless Noise-Canceling Headphones',
    description:
      'High-fidelity over-ear headphones with active noise cancellation and 30-hour battery life.',
    sku: 'ELEC-ANC-001',
    price: 199.99,
    categorySlug: 'electronics',
    initialStock: 150,
    lowStockThreshold: 15,
  },
  {
    name: 'Smart Fitness Watch v2',
    description:
      'Waterproof smart watch with heart rate monitor, sleep tracking, and built-in GPS.',
    sku: 'ELEC-SFW-002',
    price: 129.5,
    categorySlug: 'electronics',
    initialStock: 45,
    lowStockThreshold: 10,
  },
  {
    name: '4K Ultra HD Portable Projector',
    description:
      'Mini LED projector with built-in speakers, HDMI, and screen mirroring capability.',
    sku: 'ELEC-PRJ-003',
    price: 349,
    categorySlug: 'electronics',
    initialStock: 8,
    lowStockThreshold: 10,
  },
  {
    name: 'Mechanical Backlit Keyboard',
    description:
      'Wired gaming keyboard with customizable RGB backlighting and tactile blue switches.',
    sku: 'ELEC-MBK-004',
    price: 79.99,
    categorySlug: 'electronics',
    initialStock: 120,
    lowStockThreshold: 15,
  },
  {
    name: 'Ergonomic Wireless Mouse',
    description:
      '2.4GHz wireless mouse with adjustable DPI and comfortable contoured grip.',
    sku: 'ELEC-EWM-005',
    price: 24.95,
    categorySlug: 'electronics',
    initialStock: 0,
    lowStockThreshold: 5,
  },
  {
    name: 'Unisex Organic Cotton Hoodie',
    description:
      'Ultra-soft fleece hoodie made from 100% certified organic cotton. Pre-shrunk.',
    sku: 'CLOT-OCH-001',
    price: 55,
    categorySlug: 'clothing',
    initialStock: 250,
    lowStockThreshold: 20,
  },
  {
    name: 'Classic Denim Jacket',
    description:
      'Timeless button-front jean jacket with a regular fit and four functional pockets.',
    sku: 'CLOT-CDJ-002',
    price: 68,
    categorySlug: 'clothing',
    initialStock: 35,
    lowStockThreshold: 10,
  },
  {
    name: 'Breathable Running Socks (3-Pack)',
    description:
      'Moisture-wicking athletic ankle socks with arch support and cushioned soles.',
    sku: 'CLOT-BRS-003',
    price: 14.99,
    categorySlug: 'clothing',
    initialStock: 3,
    lowStockThreshold: 5,
  },
  {
    name: 'Self-Watering Ceramic Planter',
    description:
      'Stylish terracotta-lined planter with a built-in reservoir to keep plants hydrated.',
    sku: 'HOME-SCP-001',
    price: 32.5,
    categorySlug: 'home-garden',
    initialStock: 80,
    lowStockThreshold: 12,
  },
  {
    name: 'Stainless Steel French Press',
    description:
      'Double-walled insulated coffee maker with a 4-level filtration system.',
    sku: 'HOME-SFP-002',
    price: 39.99,
    categorySlug: 'home-garden',
    initialStock: 25,
    lowStockThreshold: 8,
  },
  {
    name: 'Ultrasonic Cool Mist Humidifier',
    description:
      'Whisper-quiet air humidifier with automatic shut-off and nightlight function.',
    sku: 'HOME-UCH-003',
    price: 45.9,
    categorySlug: 'home-garden',
    initialStock: 0,
    lowStockThreshold: 5,
  },
  {
    name: 'Eco-Friendly TPE Yoga Mat',
    description:
      'Non-slip 6mm thick workout mat with alignment lines, carrying strap included.',
    sku: 'SPOR-EYM-001',
    price: 29.99,
    categorySlug: 'sports',
    initialStock: 110,
    lowStockThreshold: 15,
  },
  {
    name: 'Insulated Sports Water Bottle',
    description:
      'Vacuum-insulated stainless steel bottle that keeps drinks cold for 24 hours.',
    sku: 'SPOR-IWB-002',
    price: 19.99,
    categorySlug: 'sports',
    initialStock: 40,
    lowStockThreshold: 10,
  },
  {
    name: 'The Art of Clean Code',
    description:
      'A comprehensive guide to software design principles, refactoring, and craftsmanship.',
    sku: 'BOOK-ACC-001',
    price: 28.5,
    categorySlug: 'books',
    initialStock: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Designing Data-Intensive Systems',
    description:
      'Explore the principles, algorithms, and trade-offs of modern backend architectures.',
    sku: 'BOOK-DDS-002',
    price: 42,
    categorySlug: 'books',
    initialStock: 4,
    lowStockThreshold: 5,
  },
];
