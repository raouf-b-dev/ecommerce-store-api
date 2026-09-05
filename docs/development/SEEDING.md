# Database Seeding Guide

This guide describes how to populate the local development database with sample/test data.

The seeder script provides a convenient, repeatable way to initialize your local development database with test accounts, a product catalog, inventory levels, demo orders, payments, and inventory aligned to those orders.

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

> [!NOTE]
> When `npm run db:seed` executes, it initializes the full NestJS application context (`NestFactory.createApplicationContext(AppModule)`), which automatically executes all `OnApplicationBootstrap` hooks. System roles and permissions are initialized automatically as part of the seeding process.

## How to Run Seeding

To run the seeder manually:

```bash
npm run db:seed
```

Or as part of the automated 1-command environment setup:

```bash
npm run setup
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
| **Super Administrator** | `superadmin@store.local` | `SuperAdmin123!` | All permissions (including `access_admin`, `manage_roles`).   |
| **Administrator**       | `admin@store.local`      | `Admin123!`      | Full admin permissions except `manage_roles` (includes `access_admin`). |
| **Customer**            | `customer@store.local`   | `Customer123!`   | Storefront customer; no `access_admin`. |

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

### 3. Seeded Categories & Product Catalog

Categories are seeded **before** products. `SeedDemoCategoriesUseCase` ensures the five canonical rows by **slug** (`electronics`, `clothing`, `home-garden`, `sports`, `books`). Missing rows are created; inactive ones are reactivated; active rows are left alone (names are not overwritten). The migration still inserts ids 1–5 on a fresh database; the seed step makes re-runs safe even if that insert was skipped or categories were deactivated.

The seeder then inserts **15 products** across those **5 categories** with specified initial stock levels. Each demo SKU references a category by **slug** (resolved to id at seed time). Re-running `db:seed` creates missing SKUs and backfills `categoryId` only when a demo SKU still has a null category. It does not overwrite a category you already set, and it does not assign categories to leftover `E2E-*` rows from API e2e runs. Search `ELEC-`, `CLOT-`, `HOME-`, `SPOR-`, or `BOOK-` to find the demo catalog.

- **5 High Stock** (Quantity > low stock threshold, e.g. 80-250 units)
- **5 Medium Stock** (Quantity > low stock threshold, e.g. 25-45 units)
- **3 Low Stock** (Quantity <= low stock threshold, e.g. 3-8 units)
- **2 Out of Stock** (Quantity = 0 units)

| Product Name                        | SKU            | Category        | Price   | Initial Stock | Low Stock Threshold | Status       |
| :---------------------------------- | :------------- | :-------------- | :------ | :-----------: | :-----------------: | :----------- |
| **Electronics**                     |                |                 |         |               |                     |              |
| Wireless Noise-Canceling Headphones | `ELEC-ANC-001` | Electronics     | $199.99 |      150      |         15          | High Stock   |
| Smart Fitness Watch v2              | `ELEC-SFW-002` | Electronics     | $129.50 |      45       |         10          | Medium Stock |
| 4K Ultra HD Portable Projector      | `ELEC-PRJ-003` | Electronics     | $349.00 |       8       |         10          | Low Stock    |
| Mechanical Backlit Keyboard         | `ELEC-MBK-004` | Electronics     | $79.99  |      120      |         15          | High Stock   |
| Ergonomic Wireless Mouse            | `ELEC-EWM-005` | Electronics     | $24.95  |       0       |          5          | Out of Stock |
| **Clothing**                        |                |                 |         |               |                     |              |
| Unisex Organic Cotton Hoodie        | `CLOT-OCH-001` | Clothing        | $55.00  |      250      |         20          | High Stock   |
| Classic Denim Jacket                | `CLOT-CDJ-002` | Clothing        | $68.00  |      35       |         10          | Medium Stock |
| Breathable Running Socks (3-Pack)   | `CLOT-BRS-003` | Clothing        | $14.99  |       3       |          5          | Low Stock    |
| **Home & Garden**                   |                |                 |         |               |                     |              |
| Self-Watering Ceramic Planter       | `HOME-SCP-001` | Home & Garden   | $32.50  |      80       |         12          | High Stock   |
| Stainless Steel French Press        | `HOME-SFP-002` | Home & Garden   | $39.99  |      25       |          8          | Medium Stock |
| Ultrasonic Cool Mist Humidifier     | `HOME-UCH-003` | Home & Garden   | $45.90  |       0       |          5          | Out of Stock |
| **Sports**                          |                |                 |         |               |                     |              |
| Eco-Friendly TPE Yoga Mat           | `SPOR-EYM-001` | Sports          | $29.99  |      110      |         15          | High Stock   |
| Insulated Sports Water Bottle       | `SPOR-IWB-002` | Sports          | $19.99  |      40       |         10          | Medium Stock |
| **Books**                           |                |                 |         |               |                     |              |
| The Art of Clean Code               | `BOOK-ACC-001` | Books           | $28.50  |      30       |          5          | Medium Stock |
| Designing Data-Intensive Systems    | `BOOK-DDS-002` | Books           | $42.00  |       4       |          5          | Low Stock    |

### 4. Seeded Demo Orders (for `customer@store.local`)

The seeder creates **4 demo orders** for the customer account (idempotent: skips create if that user already has any orders; re-runs still refresh payment/order timestamps and rebuild inventory). Useful for admin order list/detail, dashboard revenue, and status-transition smoke tests.

Order timestamps and linked payments use **relative UTC dates** from seed time (`now − 6d` / `−3d` / `0d` noon UTC) so the default 7-day analytics window stays populated after every `db:seed`.

| Reference name | Target status | Safe admin transitions |
| :------------- | :------------ | :--------------------- |
| Confirmed Electronics Order | `confirmed` | Process or Cancel |
| Shipped Apparel Order | `shipped` | Deliver or Cancel |
| Delivered Home & Books Order | `delivered` | (no order PATCH; refund is payment-side) |
| Pending Payment Order | `pending_payment` | Cancel (Confirm needs a completed payment) |

### 5. Seeded Demo Payments (Orders ↔ Payments)

After orders, the **payments** BC seed creates `CAPTURED` payment rows for paid demo orders (not `pending_payment`), then the **orders** BC links the real `paymentId` and refreshes order dates.

| Order reference | Relative date | Notes |
| :-------------- | :------------ | :---- |
| Confirmed Electronics Order | `now − 6 days` | CAPTURED |
| Shipped Apparel Order | `now − 3 days` | CAPTURED |
| Delivered Home & Books Order | `now` (today noon UTC) | CAPTURED + **$20** completed partial refund (`PARTIALLY_REFUNDED`) |
| Pending Payment Order | - | No payment row |

Re-seed refreshes payment `created_at` / `completed_at` and order `"createdAt"` so dashboard KPIs stay in range.

### 6. Seeded Inventory Sync (Orders ↔ Inventory)

After payments, inventory is **rebuilt** from catalog baselines using domain `reserveStock` / `confirmReservation` (no BullMQ checkout SAGA, no `reservations` table rows in v1):

| Order status | Effect | Stock outcome |
| :----------- | :----- | :------------ |
| `pending_payment` | hold | available ↓, reserved ↑ |
| `confirmed` / `processing` / `shipped` / `delivered` | consume | available ↓, reserved 0 |

Every `db:seed` resets touched demo SKUs to catalog `initialStock` with `reserved = 0`, then re-applies line effects (idempotent; no stacking).

