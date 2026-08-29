# Database Seeding Guide

This guide describes how to populate the local development database with sample/test data.

The seeder script provides a convenient, repeatable way to initialize your local development database with test accounts, a product catalog, and varying stock levels.

Architecturally, `scripts/seed.ts` is a thin CLI primary adapter. The actual seed behavior is owned by module application-layer seed use cases under `src/modules/*/core/application/seed/`.

## Seeding Prerequisites

Before seeding, ensure that:

1. Docker containers are running (PostgreSQL and Redis):
   ```bash
   npm run d:up:dev
   ```
2. Database migrations have been applied:
   ```bash
   npm run migration:run:dev
   ```
3. The NestJS application has booted at least once in development mode:
   ```bash
   npm run start:dev
   ```
   > [!IMPORTANT]
   > Booting the application at least once is required because Role and Permission system data is automatically initialized on application bootstrap (`OnApplicationBootstrap` hooks). The seeder script expects these system roles to already exist.

## How to Run Seeding

To run the seeder, execute the following npm script:

```bash
npm run db:seed
```

### Script Features

- **Production Guard**: The script will refuse to run if `NODE_ENV=production` to protect live data.
- **Idempotency**: The script is safe to run multiple times. It detects existing entries (by Email for users/customers, by SKU for products, and by Product ID for inventory) and skips them, only inserting what is missing.

---

## Seeded Data Reference

The seeder initializes the database with the following test credentials and product catalog.

### 1. Seeded User Accounts

Local development only (`npm run db:seed` refuses to run when `NODE_ENV=production`).

Seeded accounts are created with `mustChangePassword: true`. On first login, clients should route to a mandatory password-change flow before normal admin use (see [`ADMIN-BOOTSTRAP.md`](../security/ADMIN-BOOTSTRAP.md)).

The auth seeder is idempotent by email. Re-running `npm run db:seed` resets demo credentials to the documented passwords below and sets `must_change_password = true` again, so you can re-test forced rotation without manual SQL. This only applies to the three demo accounts in this table (local dev; seeding is blocked in production).

| Role                    | Email                    | Password         | Details                                                                   |
| :---------------------- | :----------------------- | :--------------- | :------------------------------------------------------------------------ |
| **Super Administrator** | `superadmin@store.local` | `SuperAdmin123!` | All permissions, including `manage_roles` (can open `/settings/roles`).   |
| **Administrator**       | `admin@store.local`      | `Admin123!`      | Full admin permissions except `manage_roles`.                             |
| **Customer**            | `customer@store.local`   | `Customer123!`   | Storefront customer; linked to a profile with a default shipping address. |

### 2. Seeded Shipping Address (for `customer@store.local`)

- **Street**: 100 Main Street
- **Street 2**: Apartment 2B
- **City**: San Francisco
- **State**: CA
- **Postal Code**: 94103
- **Country**: USA
- **Type**: HOME
- **Default**: Yes
- **Instructions**: Leave packages at front door.

### 3. Seeded Product Catalog & Inventory Levels

The seeder inserts **15 products** across **5 categories** with specified initial stock levels to cover all testing scenarios:

- **5 High Stock** (Quantity > low stock threshold, e.g. 80-250 units)
- **5 Medium Stock** (Quantity > low stock threshold, e.g. 25-45 units)
- **3 Low Stock** (Quantity <= low stock threshold, e.g. 3-8 units)
- **2 Out of Stock** (Quantity = 0 units)

| Product Name                        | SKU            | Price   | Initial Stock | Low Stock Threshold | Status       |
| :---------------------------------- | :------------- | :------ | :-----------: | :-----------------: | :----------- |
| **Electronics**                     |                |         |               |                     |              |
| Wireless Noise-Canceling Headphones | `ELEC-ANC-001` | $199.99 |      150      |         15          | High Stock   |
| Smart Fitness Watch v2              | `ELEC-SFW-002` | $129.50 |      45       |         10          | Medium Stock |
| 4K Ultra HD Portable Projector      | `ELEC-PRJ-003` | $349.00 |       8       |         10          | Low Stock    |
| Mechanical Backlit Keyboard         | `ELEC-MBK-004` | $79.99  |      120      |         15          | High Stock   |
| Ergonomic Wireless Mouse            | `ELEC-EWM-005` | $24.95  |       0       |          5          | Out of Stock |
| **Clothing**                        |                |         |               |                     |              |
| Unisex Organic Cotton Hoodie        | `CLOT-OCH-001` | $55.00  |      250      |         20          | High Stock   |
| Classic Denim Jacket                | `CLOT-CDJ-002` | $68.00  |      35       |         10          | Medium Stock |
| Breathable Running Socks (3-Pack)   | `CLOT-BRS-003` | $14.99  |       3       |          5          | Low Stock    |
| **Home & Garden**                   |                |         |               |                     |              |
| Self-Watering Ceramic Planter       | `HOME-SCP-001` | $32.50  |      80       |         12          | High Stock   |
| Stainless Steel French Press        | `HOME-SFP-002` | $39.99  |      25       |          8          | Medium Stock |
| Ultrasonic Cool Mist Humidifier     | `HOME-UCH-003` | $45.90  |       0       |          5          | Out of Stock |
| **Sports**                          |                |         |               |                     |              |
| Eco-Friendly TPE Yoga Mat           | `SPOR-EYM-001` | $29.99  |      110      |         15          | High Stock   |
| Insulated Sports Water Bottle       | `SPOR-IWB-002` | $19.99  |      40       |         10          | Medium Stock |
| **Books**                           |                |         |               |                     |              |
| The Art of Clean Code               | `BOOK-ACC-001` | $28.50  |      30       |          5          | Medium Stock |
| Designing Data-Intensive Systems    | `BOOK-DDS-002` | $42.00  |       4       |          5          | Low Stock    |
