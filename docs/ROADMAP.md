# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task.

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                         | Status  | Key Deliverables                                                                                                                                                                                             | Location                                                                           |
| :------ | :--------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **0**   | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 8 modules (Auth, Carts, Customers, Inventory, Orders, Payments, Products, Notifications) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI | `src/modules/`, `src/infrastructure/`                                              |
| **1**   | ACL Gateway & SAGA           | ✅ Done | 7 ACL Gateways across Orders, Carts, Auth · BullMQ-based checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities | `src/modules/orders/`, `src/modules/carts/`                                        |
| **2**   | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection                                                                                      | `src/shared-kernel/`, `src/infrastructure/idempotency/`                            |
| **3**   | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                   | `src/modules/*/secondary-adapters/repositories/cached-*/`                          |
| **4**   | Test Suite Foundation        | ✅ Done | Comprehensive spec files: Use case unit tests (all modules), repository integration tests (Postgres + cached), controller tests · Docker Compose for local dev (PostgreSQL 18 + Redis Stack)                 | `src/modules/*/`                                                                   |
| **5**   | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from all 61 use case/service files · Trimmed orders table from 12 to 4 indexes · Migration CLI scripts configured (`data-source.ts`)                                             | `data-source.ts`, `package.json`                                                   |
| **6**   | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node.js 24 Alpine) · `GlobalExceptionFilter` for JSON error standardization · Application Graceful Shutdown handling (`SIGTERM` & connections drain)                               | `Dockerfile`, `src/filters/`, `src/main.ts`                                        |
| **7**   | Security Hardening           | ✅ Done | `helmet` security headers · CORS with env-based origin whitelist · XSS sanitization interceptor (`sanitize-html`) · Pagination `@Max(100)` on all query DTOs                                                 | `src/main.ts`, `src/interceptors/`, `src/config/`                                  |
| **7.5** | Auth Overhaul (RBAC)         | ✅ Done | RSA RS256 JWT, Refresh Token Rotation, Session Tracking, Full RBAC (Roles/Permissions/Guards)                                                                                                                | `src/infrastructure/jwt/`, `src/modules/auth/`                                     |
| **7.6** | Auth Hardening & Quality     | ✅ Done | Abstract `PasswordHasher`, Session reuse detection, Architectural polish, Strict typed JWT payloads, Thin controllers                                                                                        | `src/modules/auth/`                                                                |
| **8**   | Observability                | ✅ Done | Winston structured JSON logging · Health checks (`/health`) · Correlation ID Middleware (`X-Request-Id`) · End-to-end `correlationId` propagation into all 18 BullMQ job handlers and schedulers             | `src/infrastructure/logging/`, `src/infrastructure/jobs/`                          |
| **8.1** | Logging Activation           | ✅ Done | Winston logger injected into NestJS application lifecycle, replacing manual error handlers                                                                                                                   | `src/main.ts`                                                                      |
| **8.5** | Architecture Hardening       | ✅ Done | Full Hexagonal audit: fixed 20+ boundary violations, enforced strict domain isolation, eliminated DTO leakage into domain/application layers.                                                                | `src/modules/*/`                                                                   |
| **10**  | SaaS & Monitoring            | ✅ Done | API Versioning (`v1`) · Rate Limiting (Redis-backed) · Prometheus metrics (`/metrics`) · Grafana Stack (Loki, Tempo, Dashboards) · OTel Distributed Tracing                                                  | `src/infrastructure/metrics/`, `src/infrastructure/tracing/`, `docker/monitoring/` |

## 🚀 Phase 9 — Pre-Deployment & Live Demo (Top Priority)

> **Goal**: Make the API safe to deploy and expose it publicly so hiring managers and reviewers can interact with a live Swagger instance.

---

### [ ] Generate Initial Database Migration

**What**: Migration CLI infrastructure is fully implemented, but no migration files exist. The app still relies on `synchronize: true`.
**Scope**:

1. Run `npm run migration:generate:dev -- src/migrations/InitialSchema`
2. Verify migration runs cleanly on an empty database.
3. Update `package.json` to ensure `migration:run` runs on production startup before serving traffic.

### [ ] Build Database Seed Script

**What**: The live demo needs data to be useful.
**Scope**:

- Create an `npm run db:seed` script.
- Seed predefined RBAC Roles and Permissions.
- Seed a catalog of 10-20 realistic products with varying stock levels.
- Seed a dummy customer account for reviewers to log in with.

### [ ] Public Demo Deployment

**What**: Deploy a constrained demo environment.
**Scope**:

- Deploy the API (and a managed Postgres/Redis) to a fast-iteration platform (e.g., Railway, Render, Fly.io).
- Expose Swagger/OpenAPI documentation publicly.
- Protect admin/destructive operations via the RBAC guards.
- Ensure `/health` is public but `/metrics` remains protected.

---

## 🧪 Phase 10 — End-to-End (E2E) Test Suite

> **Goal**: Replace the boilerplate `test/` directory with real, production-style HTTP integration tests using `supertest`.

---

### [ ] Core API Flows (Happy Path)

- **Auth**: register → login → get token → use token → refresh token.
- **Products & Inventory**: create → list → update stock → check stock.
- **Customers**: create → add address → set default address.

### [ ] Complex SAGA Verification

- **Orders & Carts**: create cart → add items → checkout.
- **SAGA Success**: full checkout flow → verify order created and stock confirmed.
- **SAGA Compensation**: trigger payment/checkout failure → verify refund triggered and stock released automatically.

### [ ] Observability Smoke Test

- Generate test traffic and assert that `X-Request-Id` correlation IDs are returned.
- (Optional) Verify telemetry metrics and logs are emitted during the test run.

---

## 💳 Phase 11 — Payment Integrations

> **Goal**: Replace mock payment adapters with real payment provider integrations to demonstrate 3rd-party vendor handling.

---

### [ ] Real Stripe Integration

- Stripe SDK (`stripe` npm package) for payment intents and charges.
- Webhook signature verification (`stripe-signature` header).
- Idempotent payment creation (use existing `IdempotencyStore`).
- Handle edge cases: partial captures, refund flows.

### [ ] Real PayPal Integration

- PayPal REST SDK for order creation and capture.
- Webhook signature verification.

---

## 📦 Phase 12 — Real-World Ecosystem & Hardening

> **Goal**: Add advanced architectural resilience patterns.

---

### [ ] Graceful Degradation (Redis Failover)

- Health-aware proxy at DI level (`createHealthAwareProxy()` pattern).
- If Redis dies → route directly to Postgres repositories.
- Zero changes to repository implementations.

### [ ] Outbox Pattern for Reliable Events

- `outbox` table for at-least-once event delivery.
- Use cases write events in same DB transaction as aggregate changes.
- Scheduled BullMQ job polls and dispatches unprocessed events.

### [ ] Real Email Notifications

- SendGrid or Resend adapter for `NotificationGateway`.
- Order confirmation and payment receipts.

---

## 📉 Phase 13 — Deferred / Low Priority

> **Goal**: Tasks that are valuable for a massive production system, but not strictly necessary for demonstrating immediate competence in an interview scenario.

---

### [ ] Domain Entity Unit Tests

The project already has 696 passing tests covering Use Cases and Repositories. Testing pure entity methods (like `OrderEntity` state transitions) is nice to have, but lower priority than E2E flows.

### [ ] Advanced Operational Observability (SLIs/SLOs/Runbooks)

Defining formal reliability targets (SLOs), Alertmanager routing, and runbooks is premature until the API has real traffic and active users.

### [ ] Admin Dashboard (Frontend)

A React/Next.js admin panel to demonstrate full-stack capability. (Deferred to focus strictly on backend positioning).

---

## ❌ Skipped (Premature)

| Task                  | Reason                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| DB Sharding           | PostgreSQL handles millions of rows. Far too early.                                                         |
| CQRS                  | Added complexity with no current need. Reconsider if read/write patterns diverge.                           |
| Event Sourcing        | Overkill for this domain. State-based persistence is fine.                                                  |
| Data Archival         | Only relevant when orders table exceeds ~500K rows.                                                         |
| GraphQL               | REST + Swagger is sufficient for current clients. Reconsider if frontend needs flexible queries.            |
| Microservices         | Modular monolith first. Extract when scaling demands it.                                                    |
| Multi-Tenancy         | Only relevant for SaaS deployment model. Premature until first paying tenant.                               |
| Per-User Permissions  | RBAC covers standard use cases. Individual overrides add complexity and can be deferred until required.     |
| Identity/Access Split | Separate modules for identity and token/session management is an optimization for microservices extraction. |
