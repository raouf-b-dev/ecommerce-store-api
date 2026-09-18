# Architecture overview

High-level context for reviewers. Detailed rules live in [`docs/architecture/DDD-HEXAGONAL.md`](../architecture/DDD-HEXAGONAL.md).

## System context

```mermaid
flowchart LR
  storefront[ecommerce-store-web]
  admin[ecommerce-admin-dashboard]
  api[ecommerce-store-api]
  pg[(PostgreSQL)]
  redis[(Redis / BullMQ)]
  storefront --> api
  admin --> api
  api --> pg
  api --> redis
```

## Checkout SAGA (simplified)

```mermaid
sequenceDiagram
  participant Store as Storefront
  participant API as OrdersController
  participant SAGA as BullMQ Checkout
  participant Pay as Mock Payments
  participant Inv as Inventory
  Store->>API: POST /v1/orders/checkout
  API->>SAGA: schedule jobs
  SAGA->>Inv: reserve stock
  SAGA->>Pay: authorize/capture mock
  SAGA-->>API: order confirmed or compensated
  API-->>Store: poll GET /v1/orders/{id}
```
