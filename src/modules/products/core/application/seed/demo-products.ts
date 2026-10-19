export interface DemoSeedProduct {
  name: string;
  description: string;
  sku: string;
  price: number;
  currency: string;
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
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
    categorySlug: 'electronics',
    initialStock: 10,
    lowStockThreshold: 10,
  },
  {
    name: 'Mechanical Backlit Keyboard',
    description:
      'Wired gaming keyboard with customizable RGB backlighting and tactile blue switches.',
    sku: 'ELEC-MBK-004',
    price: 79.99,
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
    categorySlug: 'clothing',
    initialStock: 40,
    lowStockThreshold: 5,
  },
  {
    name: 'Self-Watering Ceramic Planter',
    description:
      'Stylish terracotta-lined planter with a built-in reservoir to keep plants hydrated.',
    sku: 'HOME-SCP-001',
    price: 32.5,
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
    categorySlug: 'home-garden',
    initialStock: 50,
    lowStockThreshold: 5,
  },
  {
    name: 'Eco-Friendly TPE Yoga Mat',
    description:
      'Non-slip 6mm thick workout mat with alignment lines, carrying strap included.',
    sku: 'SPOR-EYM-001',
    price: 29.99,
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
    categorySlug: 'books',
    initialStock: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'USB-C GaN Charger 65W',
    description:
      'Compact gallium-nitride wall charger with two USB-C ports and fold-flat prongs.',
    sku: 'ELEC-GNC-006',
    price: 34.99,
    currency: 'USD',
    categorySlug: 'electronics',
    initialStock: 140,
    lowStockThreshold: 15,
  },
  {
    name: 'Bluetooth Portable Speaker',
    description:
      'Water-resistant speaker with 12-hour playback and a paired stereo mode.',
    sku: 'ELEC-BPS-007',
    price: 59.0,
    currency: 'USD',
    categorySlug: 'electronics',
    initialStock: 90,
    lowStockThreshold: 10,
  },
  {
    name: 'Merino Wool Beanie',
    description:
      'Lightweight merino beanie that stays warm without itching. One size.',
    sku: 'CLOT-MWB-004',
    price: 28.0,
    currency: 'USD',
    categorySlug: 'clothing',
    initialStock: 120,
    lowStockThreshold: 15,
  },
  {
    name: 'Linen Summer Shirt',
    description:
      'Breathable linen button-down with a relaxed fit and mother-of-pearl buttons.',
    sku: 'CLOT-LSS-005',
    price: 48.0,
    currency: 'USD',
    categorySlug: 'clothing',
    initialStock: 80,
    lowStockThreshold: 10,
  },
  {
    name: 'Linen Throw Blanket',
    description:
      'Stonewashed linen throw for sofa or bed. Gets softer with each wash.',
    sku: 'HOME-LTB-004',
    price: 64.0,
    currency: 'USD',
    categorySlug: 'home-garden',
    initialStock: 100,
    lowStockThreshold: 12,
  },
  {
    name: 'Scented Soy Candle Set',
    description:
      'Three 8-ounce soy candles: cedar, citrus, and unscented. Cotton wicks.',
    sku: 'HOME-SSC-005',
    price: 36.0,
    currency: 'USD',
    categorySlug: 'home-garden',
    initialStock: 160,
    lowStockThreshold: 15,
  },
  {
    name: 'Adjustable Dumbbell Pair',
    description:
      'Dial-adjust dumbbells from 5 to 25 pounds each, with a storage tray.',
    sku: 'SPOR-ADS-003',
    price: 189.0,
    currency: 'USD',
    categorySlug: 'sports',
    initialStock: 50,
    lowStockThreshold: 8,
  },
  {
    name: 'Resistance Band Kit',
    description:
      'Five loop bands plus a carry pouch and a printed exercise card.',
    sku: 'SPOR-RBK-004',
    price: 22.0,
    currency: 'USD',
    categorySlug: 'sports',
    initialStock: 130,
    lowStockThreshold: 15,
  },
  {
    name: 'The Pragmatic Programmer',
    description:
      'Essays on craft, estimation, and keeping software soft. Anniversary edition.',
    sku: 'BOOK-TPP-003',
    price: 39.95,
    currency: 'USD',
    categorySlug: 'books',
    initialStock: 70,
    lowStockThreshold: 8,
  },
  {
    name: 'Domain-Driven Design',
    description:
      'Eric Evans on models, bounded contexts, and ubiquitous language.',
    sku: 'BOOK-DDD-004',
    price: 54.99,
    currency: 'USD',
    categorySlug: 'books',
    initialStock: 55,
    lowStockThreshold: 8,
  },
  {
    name: 'Daily Mineral Sunscreen',
    description:
      'SPF 30 mineral sunscreen, unscented, 3.4 fl oz. No white cast on most skin tones.',
    sku: 'BEAU-DMS-001',
    price: 18.0,
    currency: 'USD',
    categorySlug: 'beauty',
    initialStock: 180,
    lowStockThreshold: 20,
  },
  {
    name: 'Gentle Foaming Cleanser',
    description: 'Fragrance-free gel cleanser for face. 5 fl oz pump bottle.',
    sku: 'BEAU-GFC-002',
    price: 16.5,
    currency: 'USD',
    categorySlug: 'beauty',
    initialStock: 150,
    lowStockThreshold: 20,
  },
  {
    name: 'Compact Camping Lantern',
    description:
      'Rechargeable LED lantern with a warm mode and a USB-C power bank.',
    sku: 'OUTD-CCL-001',
    price: 27.5,
    currency: 'USD',
    categorySlug: 'outdoors',
    initialStock: 95,
    lowStockThreshold: 10,
  },
  {
    name: 'Stainless Travel Mug',
    description:
      '12-ounce vacuum mug with a leak-resistant lid. Keeps drinks hot for 6 hours.',
    sku: 'OUTD-STM-002',
    price: 24.0,
    currency: 'USD',
    categorySlug: 'outdoors',
    initialStock: 110,
    lowStockThreshold: 12,
  },
];
