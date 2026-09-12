# ADR-0008: Money Snapshot, Cart Domain Currency Boundaries, and CQRS Separation

- **Status**: Accepted
- **Date**: 2026-09-12
- **Deciders**: Engineering Core Team
- **Context**: Cart Financial Modeling, Currency Snapshotting, and Scalable Domain Boundaries
- **Companion**: [CQRS.md](../CQRS.md)

---

## 1. Context & Problem Statement

In the catalog bounded context, products define a monetary price and an ISO-4217 currency (`USD`). In the carts bounded context, shopping carts compute financial totals (`subtotal`, `totalAmount`).

As a headless e-commerce platform designed to be consumed by diverse clients (web storefronts, mobile apps, POS terminals, and B2B partner integrations), the API must provide complete, self-describing financial contracts. API consumers must never be required to guess, assume, or hardcode currency defaults.

When evaluating how to model currency in the Cart module, two core architectural questions arose:
1. Does persisting `currency` on `cart_items` violate separation of concerns, given that `products` already defines price and currency?
2. Should currency and price be joined dynamically from the products table on the read path rather than persisted on the write model?

---

## 2. Decisions

### Decision 1: Catalog Money vs. Cart/Order Money Snapshot
- **Decision**: The Cart bounded context snapshots the commercial offer (`price`, `currency`, `productName`, `imageUrl`) on the write path when an item is added.
- **Rationale**:
  - In Domain-Driven Design (Fowler / Evans), **Money is a Value Object** consisting of an amount and an ISO-4217 currency code. A numeric price without a currency is an incomplete domain concept.
  - The Products bounded context owns the **current catalog listing price**.
  - The Carts bounded context owns the **commercial fact of what was added to the basket at a specific moment**.
  - Persisting currency alongside price is deliberate, point-in-time data denormalization (commercial snapshotting), identical to snapshotting `price` and `productName` on cart lines and order lines.

### Decision 2: Rejection of Read-Path-Only JOIN Repricing
- **Decision**: Reject dynamically joining `products.price` and `products.currency` on `GET /v1/carts/:id`.
- **Rationale**:
  - If cart totals were recomputed on the read path from live catalog tables, any catalog price change or currency redenomination would silently alter open customer baskets without their knowledge or consent.
  - Snapshotting on the write path ensures commercial integrity, price stability during active sessions, and deterministic checkout calculation across all client channels.

### Decision 3: Single-Currency Cart Domain Invariant for MVP
- **Decision**: The Cart aggregate enforces a strict mono-currency invariant:
  $$\forall \text{ item} \in \text{cart.items}, \; \text{item.currency} == \text{cart.currency}$$
  Attempting to add an item with a different currency than existing cart items is rejected by the domain aggregate (`Cannot mix currencies in one cart`).
- **Rationale**: Keeps the MVP clean, predictable, and fully scalable without over-engineering multi-currency baskets.

### Decision 4: Foreign Exchange (FX) Stays Upstream of Cart
- **Decision**: The Cart module must **never** own FX rate tables, daily rate feeds, or currency market APIs.
- **Rationale**:
  - In future multi-currency phases (Phase 17e), currency conversion will happen **before** or **at** the snapshot point via a dedicated Pricing/FX service or port (`ExchangeRatePort`).
  - The Cart simply receives the converted `Money` via its Anti-Corruption Layer (ACL) and snapshots it.

### Decision 5: CQRS Command/Query Separation in `CreateCartUseCase`
- **Decision**: `CreateCartUseCase` (a Command use case) must not inject `CartQueryService` and must not return a read projection. It persists the `Cart` aggregate and returns the domain interface primitives `ICart` (`saveResult.value.toPrimitives()`).
- **Rationale**:
  - Injecting the read-side query adapter into a write use case mixes the Command and Query stacks and executes an unnecessary SQL `SELECT ... JOIN` query over an entity already in memory.
  - Returning `ICart` primitives aligns with the monorepo convention established by `CreateProductUseCase` (`IProduct`), `CreateUserUseCase` (`IUser`), and `ConfirmOrderUseCase` (`IOrder`), avoiding ad-hoc presentation mapping in the write pipeline.
  - Read query projections (`CartPresentationDTO`) remain exclusively owned by the query stack (`GetCartUseCase`, `CartQueryService`, and `PostgresCartQueryAdapter`).

### Decision 6: Headless API Financial Contract Autonomy
- **Decision**: The API is the sole authority for financial data (`price`, `currency`, `subtotal`, `totalAmount`). All monetary response DTOs explicitly expose the ISO-4217 currency code.
- **Rationale**: Any client - whether mobile app, web storefront, or external service - can unambiguously format and process amounts according to user locale and client presentation rules, without embedding domain currency assumptions.

---

## 3. Consequences

### Positive
- Strict DDD compliance: Money is never naked or ambiguous in domain models or API contracts.
- Zero price drift: Open shopping carts maintain price stability regardless of catalog updates.
- Strict CQRS separation: Command use cases do not depend on or query read-side query adapters.
- Client-agnostic design: Eliminates any coupling between the API specification and client-side implementation details.
- Clean extension path: Future phases can introduce `Money` value objects and FX ports without refactoring the Cart persistence schema.

### Negative / Trade-offs
- Cart lines require an explicit `currency` column in PostgreSQL (`cart_items.currency varchar(3)`).
- Adding items to cart requires passing the product's currency through the `CartProductGateway` ACL.
