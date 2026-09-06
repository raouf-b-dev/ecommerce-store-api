---
Document Type: Applied Domain Architecture
Audience: Backend Engineers & System Architects
Status: Stable
Owner: Engineering Core Team
Last Reviewed: 2026-08-30
---

# Admin analytics read models

Operational KPIs for the admin Control Center. **Not** Prometheus/Grafana observability.

Architecture decision: [ADR-0007](../adr/ADR-0007-admin-analytics-query-composition.md).

## Boundary

| Layer | Role |
| --- | --- |
| Postgres aggregates via `/v1/admin/analytics/*` | Exact money/stock/order ops pulse |
| Prometheus → Grafana | System health (RED, infra, SAGA rates) |

Do not expose `/metrics` to the admin SPA. Do not invent revenue in clients.

## Revenue definition

- **Included statuses:** `CAPTURED`, `COMPLETED`, `PARTIALLY_REFUNDED`, `REFUNDED` (net = gross − `refunded_amount`)
- **Gross:** `SUM(amount)`
- **Refunded:** `SUM(refunded_amount)`
- **Net:** gross − refunded
- **paidOrderCount:** count of those payments in range (AOV denominator)
- **AOV:** `net / paidOrderCount` (0 if none)
- **Event time:** `COALESCE(completed_at, created_at)`
- **Currency:** from payment rows (typically `USD`)

## Orders

- **ordersCount:** orders with `"createdAt"` in range (all statuses)
- **Attention:** current counts for `pending_payment`, `confirmed`, `processing`
- **Top products:** `order_items` joined to orders in `confirmed` | `processing` | `shipped` | `delivered` with `"createdAt"` in range

## Time semantics

- All buckets and period bounds are **UTC** (`timezone: "UTC"` in responses)
- `bucket` is a whitelist enum: `day` | `week` only
- Max `to − from` span: **90 days**
- Time series is **zero-filled** for every bucket in range
- Analytics queries set `statement_timeout` to 5s

## Permissions

| Endpoint | Permission |
| --- | --- |
| `GET /v1/admin/analytics/overview` | `view_all_orders` |
| `GET /v1/admin/analytics/payments/time-series` | `view_all_payments` |
| `GET /v1/admin/analytics/products/top` | `view_all_orders` |
| `GET /v1/admin/analytics/inventory/alerts` | `view_all_inventory` |

## Inventory alerts

`availableQuantity <= lowStockThreshold` (same rule as inventory list `lowStockOnly`).
