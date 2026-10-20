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

Emails and passwords come from env (`DEMO_*_EMAIL` / `DEMO_*_PASSWORD`). Tables below show the `.env.example` defaults; override on the host if needed.

### Local Compose (`DEMO_READ_ONLY=false`, default)

Seeded accounts are created with `mustChangePassword: true`. On first login, clients should route to a mandatory password-change flow before normal admin use (see [`ADMIN-BOOTSTRAP.md`](../security/ADMIN-BOOTSTRAP.md)).

The auth seeder is idempotent by email. Re-running `npm run db:seed` resets demo credentials to the configured passwords and sets `must_change_password = true` again, so you can re-test forced rotation without manual SQL. This only applies to the three demo accounts in this table (local dev; seeding is blocked in production).

| Role                    | Email (default)          | Password (default) | Details                                                                 |
| :---------------------- | :----------------------- | :----------------- | :---------------------------------------------------------------------- |
| **Super Administrator** | `superadmin@store.local` | `SuperAdmin123!`   | All permissions (including `access_admin`, `manage_roles`).             |
| **Administrator**       | `admin@store.local`      | `Admin123!`        | Full admin permissions except `manage_roles` (includes `access_admin`). |
| **Customer**            | `customer@store.local`   | `Customer123!`     | Storefront customer; no `access_admin`.                                 |

### Hosted shared demo (`DEMO_READ_ONLY=true`)

When `DEMO_READ_ONLY=true` (hosted public instance), the seeder:

- Seeds the **viewer** account (`ADMIN_READONLY`) from `DEMO_VIEWER_EMAIL` / `DEMO_VIEWER_PASSWORD` and a **silent fixture customer** from `DEMO_CUSTOMER_*` (needed for demo orders/cart the viewer can browse)
- Does **not** create or update `superadmin@` / `admin@` (or whatever `DEMO_SUPERADMIN_*` / `DEMO_ADMIN_*` are set to). If a volume was previously seeded in local mode, wipe or use a fresh database before enabling hosted mode
- Sets `mustChangePassword: false` on the hosted seed accounts (one-click viewer login)
- Mutations stay on RBAC: `ADMIN_READONLY` has `access_admin` + `view_all_*` and no `manage_*`. A private writable owner is created with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see [`ADMIN-BOOTSTRAP.md`](../security/ADMIN-BOOTSTRAP.md)), not from the public README
- Storefront visitors should **register** their own accounts. Do not publish the fixture customer as the hosted shop login

**Public hosted sign-in (document this row only):**

| Role                  | Email (default)      | Password (default) | Details                                           |
| :-------------------- | :------------------- | :----------------- | :------------------------------------------------ |
| **Admin (read-only)** | `viewer@store.local` | `Viewer123!`       | `access_admin` + all `view_all_*`. No `manage_*`. |

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

### 3. Seeded Demo Cart (for `customer@store.local`)

The customer account also receives a **pre-filled cart** (idempotent with orders: skipped if the user already has a cart). Typical lines after a fresh seed:

- Wireless Noise-Canceling Headphones (`ELEC-ANC-001`) x 1
- Unisex Organic Cotton Hoodie (`CLOT-OCH-001`) x 2
- Stainless Steel French Press (`HOME-SFP-002`) x 1

That cart is expected storefront behavior, not a bug. If you upgraded from an older local database where cart or order **line rows were persisted with `id = 0`**, lines can disappear from `GET /v1/carts/current` or order detail while header totals still look correct. Re-run `npm run db:seed` (or add any item to the cart once) so child rows get real serial primary keys again.

The **Delivered Home & Books Order** demo includes a ceramic planter plus `BOOK-ACC-001` for a **$61.00** total ($32.50 + $28.50). That math matches the seeded catalog prices.

### 4. Seeded Categories & Product Catalog

Categories are seeded **before** products. `SeedDemoCategoriesUseCase` ensures seven rows by **slug** (`electronics`, `clothing`, `home-garden`, `sports`, `books`, `beauty`, `outdoors`). Missing rows are created; inactive ones are reactivated; active rows are left alone (names are not overwritten). The migration still inserts ids 1-5 on a fresh database; `beauty` and `outdoors` exist only after seed. The seed step makes re-runs safe even if that insert was skipped or categories were deactivated.

The seeder then inserts **29 products** across those **7 categories** with specified initial stock levels. Each demo SKU references a category by **slug** (resolved to id at seed time). Re-running `db:seed` creates missing SKUs and backfills `categoryId` only when a demo SKU still has a null category. It does not overwrite a category you already set, and it does not assign categories to leftover `E2E-*` rows from API e2e runs. Search `ELEC-`, `CLOT-`, `HOME-`, `SPOR-`, `BOOK-`, `BEAU-`, or `OUTD-` to find the demo catalog.

Most SKUs start at 25 units or more so a public click-through checkout does not 409 on the first orders. `ELEC-PRJ-003` sits on its low-stock threshold (10). `ELEC-EWM-005` is the only out-of-stock SKU.

| Product Name                        | SKU            | Category      | Price   | Initial Stock | Low Stock Threshold | Status       |
| :---------------------------------- | :------------- | :------------ | :------ | :-----------: | :-----------------: | :----------- |
| **Electronics**                     |                |               |         |               |                     |              |
| Wireless Noise-Canceling Headphones | `ELEC-ANC-001` | Electronics   | $199.99 |      150      |         15          | High Stock   |
| Smart Fitness Watch v2              | `ELEC-SFW-002` | Electronics   | $129.50 |      45       |         10          | Medium Stock |
| 4K Ultra HD Portable Projector      | `ELEC-PRJ-003` | Electronics   | $349.00 |      10       |         10          | Low Stock    |
| Mechanical Backlit Keyboard         | `ELEC-MBK-004` | Electronics   | $79.99  |      120      |         15          | High Stock   |
| Ergonomic Wireless Mouse            | `ELEC-EWM-005` | Electronics   | $24.95  |       0       |          5          | Out of Stock |
| USB-C GaN Charger 65W               | `ELEC-GNC-006` | Electronics   | $34.99  |      140      |         15          | High Stock   |
| Bluetooth Portable Speaker          | `ELEC-BPS-007` | Electronics   | $59.00  |      90       |         10          | High Stock   |
| **Clothing**                        |                |               |         |               |                     |              |
| Unisex Organic Cotton Hoodie        | `CLOT-OCH-001` | Clothing      | $55.00  |      250      |         20          | High Stock   |
| Classic Denim Jacket                | `CLOT-CDJ-002` | Clothing      | $68.00  |      35       |         10          | Medium Stock |
| Breathable Running Socks (3-Pack)   | `CLOT-BRS-003` | Clothing      | $14.99  |      40       |          5          | High Stock   |
| Merino Wool Beanie                  | `CLOT-MWB-004` | Clothing      | $28.00  |      120      |         15          | High Stock   |
| Linen Summer Shirt                  | `CLOT-LSS-005` | Clothing      | $48.00  |      80       |         10          | High Stock   |
| **Home & Garden**                   |                |               |         |               |                     |              |
| Self-Watering Ceramic Planter       | `HOME-SCP-001` | Home & Garden | $32.50  |      80       |         12          | High Stock   |
| Stainless Steel French Press        | `HOME-SFP-002` | Home & Garden | $39.99  |      25       |          8          | Medium Stock |
| Ultrasonic Cool Mist Humidifier     | `HOME-UCH-003` | Home & Garden | $45.90  |      50       |          5          | High Stock   |
| Linen Throw Blanket                 | `HOME-LTB-004` | Home & Garden | $64.00  |      100      |         12          | High Stock   |
| Scented Soy Candle Set              | `HOME-SSC-005` | Home & Garden | $36.00  |      160      |         15          | High Stock   |
| **Sports**                          |                |               |         |               |                     |              |
| Eco-Friendly TPE Yoga Mat           | `SPOR-EYM-001` | Sports        | $29.99  |      110      |         15          | High Stock   |
| Insulated Sports Water Bottle       | `SPOR-IWB-002` | Sports        | $19.99  |      40       |         10          | Medium Stock |
| Adjustable Dumbbell Pair            | `SPOR-ADS-003` | Sports        | $189.00 |      50       |          8          | High Stock   |
| Resistance Band Kit                 | `SPOR-RBK-004` | Sports        | $22.00  |      130      |         15          | High Stock   |
| **Books**                           |                |               |         |               |                     |              |
| The Art of Clean Code               | `BOOK-ACC-001` | Books         | $28.50  |      30       |          5          | Medium Stock |
| Designing Data-Intensive Systems    | `BOOK-DDS-002` | Books         | $42.00  |      30       |          5          | High Stock   |
| The Pragmatic Programmer            | `BOOK-TPP-003` | Books         | $39.95  |      70       |          8          | High Stock   |
| Domain-Driven Design                | `BOOK-DDD-004` | Books         | $54.99  |      55       |          8          | High Stock   |
| **Beauty**                          |                |               |         |               |                     |              |
| Daily Mineral Sunscreen             | `BEAU-DMS-001` | Beauty        | $18.00  |      180      |         20          | High Stock   |
| Gentle Foaming Cleanser             | `BEAU-GFC-002` | Beauty        | $16.50  |      150      |         20          | High Stock   |
| **Outdoors**                        |                |               |         |               |                     |              |
| Compact Camping Lantern             | `OUTD-CCL-001` | Outdoors      | $27.50  |      95       |         10          | High Stock   |
| Stainless Travel Mug                | `OUTD-STM-002` | Outdoors      | $24.00  |      110      |         12          | High Stock   |

#### Demo product photos

Every demo SKU gets a product photo. The files live in `assets/demo-media/v2/<sku-lowercase>.webp` (800x800 WebP, AI-generated; see [`assets/demo-media/LICENSE.md`](../../assets/demo-media/LICENSE.md)) and the API serves them itself at `/media/demo/v2/<file>`:

- **Stored URL**: the seed writes absolute URLs built from `PUBLIC_BASE_URL`, for example `http://localhost:3000/media/demo/v2/elec-anc-001.webp`. `PUBLIC_BASE_URL` is required and must be a bare http(s) origin; the API refuses to start without it. Locally it matches `PORT` (`http://localhost:3000`); on a deployed host it is the public origin browsers use to reach the API, and staging and production reject plain `http` (loopback hosts excepted).
- **Re-runs**: `db:seed` fills `imageUrl` when it is null and rewrites URLs whose path has the demo shape `/media/demo/v<n>/<sku>.webp` (an older version or an old base URL). Any other URL was set by an operator and is left alone.
- **Cross-origin loading**: responses carry `Cross-Origin-Resource-Policy: cross-origin` (helmet defaults every other route to `same-origin`) and `Cache-Control: public, max-age=31536000, immutable`. The `v2` in the URL is a **cache-bust version**, not a second set of alternate photos: only the folder named by `DEMO_MEDIA_VERSION` is served. When any photo changes, create a new folder (for example `v3`), bump the constant, and drop the previous folder once you no longer need those old URLs.
- **Clients**: the storefront renders images through `next/image` and allows its `NEXT_PUBLIC_API_BASE_URL` origin, so `PUBLIC_BASE_URL` must share that origin (or be added to `NEXT_PUBLIC_IMAGE_ALLOWED_HOSTS`). The admin loads URLs directly with `<img>`.
- **Docker**: the production image copies `assets/demo-media`; the static handler resolves it from the working directory (`/app`) and fails the boot when the `DEMO_MEDIA_VERSION` folder is missing.

### 5. Seeded Demo Orders (for `customer@store.local`)

The seeder creates **4 demo orders** for the customer account (idempotent: skips create if that user already has any orders; re-runs still refresh payment/order timestamps and rebuild inventory). Useful for admin order list/detail, dashboard revenue, and status-transition smoke tests.

Order timestamps and linked payments use **relative UTC dates** from seed time (`now − 6d` / `−3d` / `0d` noon UTC) so the default 7-day analytics window stays populated after every `db:seed`.

| Reference name               | Target status     | Safe admin transitions                     |
| :--------------------------- | :---------------- | :----------------------------------------- |
| Confirmed Electronics Order  | `confirmed`       | Process or Cancel                          |
| Shipped Apparel Order        | `shipped`         | Deliver or Cancel                          |
| Delivered Home & Books Order | `delivered`       | (no order PATCH; refund is payment-side)   |
| Pending Payment Order        | `pending_payment` | Cancel (Confirm needs a completed payment) |

### 6. Seeded Demo Payments (Orders ↔ Payments)

After orders, the **payments** BC seed creates `CAPTURED` payment rows for paid demo orders (not `pending_payment`), then the **orders** BC links the real `paymentId` and refreshes order dates.

| Order reference              | Relative date          | Notes                                                              |
| :--------------------------- | :--------------------- | :----------------------------------------------------------------- |
| Confirmed Electronics Order  | `now − 6 days`         | CAPTURED                                                           |
| Shipped Apparel Order        | `now − 3 days`         | CAPTURED                                                           |
| Delivered Home & Books Order | `now` (today noon UTC) | CAPTURED + **$20** completed partial refund (`PARTIALLY_REFUNDED`) |
| Pending Payment Order        | -                      | No payment row                                                     |

Re-seed refreshes payment `created_at` / `completed_at` and order `"createdAt"` so dashboard KPIs stay in range.

### 7. Seeded Inventory Sync (Orders ↔ Inventory)

After payments, inventory is **rebuilt** from catalog baselines using domain `reserveStock` / `confirmReservation` (no BullMQ checkout SAGA, no `reservations` table rows in v1):

| Order status                                         | Effect  | Stock outcome           |
| :--------------------------------------------------- | :------ | :---------------------- |
| `pending_payment`                                    | hold    | available ↓, reserved ↑ |
| `confirmed` / `processing` / `shipped` / `delivered` | consume | available ↓, reserved 0 |

Every `db:seed` resets touched demo SKUs to catalog `initialStock` with `reserved = 0`, then re-applies the four fixture order lines (idempotent; shopper checkouts are not stacked onto the baseline). `POST /v1/admin/demo/reset` runs this same pipeline when demo reset is enabled. See [HOSTED-DEMO.md](../infrastructure/HOSTED-DEMO.md).
