# E-Commerce Store API: Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`AGENT.md`](../AGENT.md) (coding guidelines), [`docs/architecture/DDD-HEXAGONAL.md`](architecture/DDD-HEXAGONAL.md) (strict DDD reference), [`docs/architecture/CQRS.md`](architecture/CQRS.md) (CQRS read-path analysis), [`docs/integration/INTEGRATION-PATTERNS.md`](integration/INTEGRATION-PATTERNS.md) (cross-context communication), [`docs/security/SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) (secrets & env management)

---

## How to Use This File

- `[ ]`: Not started
- `[/]`: In progress
- `[x]`: Completed
- Open a new chat, reference this file, and pick the next unchecked task in top-to-bottom order.
- **Across phases**: work sequentially unless a track is marked non-blocking / parallel.
- **Within a phase**: **Parallel tracks** (e.g. `15-A`, `15-B`) may run in any order; the phase is not done until every track is `[x]`.

---

## Next up

Pick the first unchecked integer phase. Letter suffixes (`15b`, `14c`, ...) are stable IDs - do not renumber them.

1. **Phase 18** - Real Stripe SDK and webhook idempotency (Money alignment in **17** is done).
2. **Phase 19** - Multi-instance and distributed consistency. **Complete before 2+ application instances.**
3. Then **21 → 24** in the pending table. Phases **15–17** and **20** are done. Phase **16** optional staging deploy remains deferred (see Phase 16).

---

## Completed Phases: Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                                        | Status | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                                      | Location                                                                                                                   |
| ------- | ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **0**   | Foundation                                  | Done   | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                                                                                         | `src/modules/`, `src/infrastructure/`                                                                                      |
| **1**   | ACL Gateway & SAGA                          | Done   | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                                                                                      | `src/modules/orders/`, `src/modules/carts/`                                                                                |
| **2**   | Result Pattern & Idempotency                | Done   | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis `SET NX` store for checkout protection · idempotency **fail-closed** on Redis errors (HTTP 503)                                                                                                                                                                                                                    | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                                                    |
| **3**   | Decorator-based Caching                     | Done   | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                                                                                            | `src/modules/*/secondary-adapters/repositories/cached-*/`                                                                  |
| **4**   | Test Suite Foundation                       | Done   | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                                                                                  | `src/modules/*/`, `src/testing/`, `test/architecture/`                                                                     |
| **5**   | Code Quality (v0.2.0)                       | Done   | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                                                                             | `data-source.ts`, `package.json`                                                                                           |
| **6**   | Deployment Blockers                         | Done   | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                                                                                 | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                                                        |
| **7**   | Security & Authentication                   | Done   | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                                                                              | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                                                    |
| **8**   | Observability & SaaS                        | Done   | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`)                                                              | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md`                             |
| **9**   | Local DB Seeding                            | Done   | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                                                                                          | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                                                    |
| **10**  | Security Hardening Phase 2                  | Done   | OWASP Top 10:2025 audit document (`OWASP-COMPLIANCE.md`) · Dependabot + CI `npm audit` scanning · `eslint-plugin-security` static analysis · Winston PII log redaction · `GlobalExceptionFilter` production error code masking · User-scoped `UserThrottlerGuard` rate limiting                                                                                                                       | `.github/`, `docs/security/`, `src/infrastructure/`                                                                        |
| **11**  | Data Integrity & Concurrency                | Done   | OCC version locking (`@VersionColumn`, HTTP 409 conflict filter) · Pessimistic inventory reservation row locking (`SELECT FOR UPDATE`) · Redis-backed cart TTL (30 days) with RedisJSON storage & graceful re-initialization · BullMQ inventory reconciliation audit job (`inventory_drift_count` Prometheus metric) · Transaction isolation level audit & query composite/partial index optimization | `src/modules/*/`, `src/infrastructure/database/`, `docs/data/`                                                             |
| **12**  | CQRS Read Path                              | Done   | Query ports & flat read DTOs (7 modules) · TypeORM JOIN query adapters & mappers · read use case refactor · controller presentation updates · application command contracts · Testcontainers integration specs · `EXPLAIN ANALYZE` index verification · 18/18 architecture boundary rules                                                                                                             | `src/modules/*/core/application/queries/`, `src/modules/*/secondary-adapters/query/`, `test/integration/`, `docs/testing/` |
| **12b** | CI/CD Pipeline (GitHub Actions)             | Done   | Fan-out/fan-in CI · CI Status Check aggregator · blocking `npm audit` · PR dependency review · Docker validate (PR) · GHCR publish · smoke · liveness/readiness                                                                                                                                                                                                                                       | `.github/workflows/ci.yml`, `.github/actions/prepare-test-env/`, `scripts/smoke-test.js`, `docs/infrastructure/cicd/`      |
| **13**  | Production Confidence & Integration Testing | Done   | Typed mocks · domain GWT specs · real-DB repos · concurrent checkout lock proof · E2E auth/IDOR/SAGA/idempotency/cookies                                                                                                                                                                                                                                                                              | `src/modules/*/`, `src/testing/`, `test/e2e/`, `docs/testing/`                                                             |
| **14**  | Single-Instance Production Gate             | Done   | Baseline migration · Redis cleanup + degradation · probes · backup/restore/smoke · secret rotation docs                                                                                                                                                                                                                                                                                               | `src/migrations/`, `scripts/`, `docs/infrastructure/`                                                                      |
| **14b** | Forced Credential Rotation                  | Done   | `mustChangePassword` · change-password endpoint · global guard · session revoke                                                                                                                                                                                                                                                                                                                       | `src/modules/authentication/`, `src/guards/`                                                                               |
| **14c** | OpenAPI Truthfulness                        | Done   | `generate:openapi` + `audit:openapi` · handler-aligned DTOs · cookie-first auth docs                                                                                                                                                                                                                                                                                                                  | `scripts/`, `src/infrastructure/swagger/`, `src/modules/*/primary-adapters/`                                               |
| **14d** | Operator HTTP Gaps                          | Done   | Product activate/deactivate HTTP · assign/replace user role over HTTP                                                                                                                                                                                                                                                                                                                                 | `src/modules/products/`, `src/modules/identity/`                                                                           |
| **14e** | Developer Onboarding (bootstrap slice)      | Done   | `npm run setup` / `setup:down` / `setup:reset` (env → infra wait → migrations → seed). Value matrix, C4 assets, Bruno deferred to **Phase 16**                                                                                                                                                                                                                                                        | `scripts/setup.js`, `package.json`                                                                                         |
| **14f** | User Detail Address Projection              | Done   | `GET /v1/users/{id}` returns `addresses[]`                                                                                                                                                                                                                                                                                                                                                            | `src/modules/identity/`                                                                                                    |
| **15b** | Shopper HTTP contract                       | Done   | `GET /v1/users/me` · `GET /v1/carts/current` (404 = no cart) · lock public inventory to `view_all_inventory` · `MUST_CHANGE_PASSWORD` code · checkout default-shipping + typed `Retry-After` OpenAPI. Required for checkout-capable HTTP clients. Detail in git.                                                                                                                                      | `src/modules/identity/`, `carts/`, `inventory/`, `orders/`, `src/guards/`                                                  |
| **17a** | Customer Catalog Read Path (slice)          | Done   | Shopper catalog list/detail via `@OptionalAuth` + `CatalogVisibilityPolicy`. Emails/webhooks/cart recovery deferred to **Phase 21**                                                                                                                                                                                                                                                                   | `src/modules/products/`                                                                                                    |

> **Note**: Phase 0 shipped 10 modules and Passport JWT; the tree now has **11 modules** (Analytics added later) and RS256 via `jose`. Cache role-permission resolution shipped under former Phase 16 tooling and is complete.

---

## Pending Work: Execution Sequence

> **Execution guide**: Phases **15–17** and **20** are complete. Pick the next unchecked phase top-to-bottom (**18**). Complete **Phase 19** before deploying to 2+ application instances.
>
> - **15b** is done and was required before Phase **20** (satisfied).
> - Phase **16** optional staging deploy is deferred; it does not block **18**.
> - Catalog GETs (old 17a) are done; remaining notifications work is Phase **21**.

| Phase  | Name                                              | Status | Priority | Target / Focus                                                                                      |
| ------ | ------------------------------------------------- | ------ | :------: | --------------------------------------------------------------------------------------------------- |
| **15** | Platform Hygiene & Supply-Chain Alignment         | `[x]`  |  `[P0]`  | engines, migration script NODE_ENV, OpenAPI in CI, webhook fail-closed, Actions SHA pins / timeouts |
| **16** | Complete Onboarding DX & Architecture Assets      | `[x]`  |  `[P0]`  | Remainder of 14e: value matrix, C4/SAGA assets, Bruno/Postman; optional staging track               |
| **17** | Money & Currency Domain Alignment                 | `[x]`  |  `[P1]`  | **Bumped** old 17e - pricing truth before real Stripe (Money VO + explicit shipping; FX deferred)   |
| **18** | Real Stripe SDK & Webhook Idempotency             | `[ ]`  |  `[P1]`  | **Bumped** old 17b - HMAC + event.id dedupe (mock fail-closed already in 15)                        |
| **19** | Multi-Instance & Distributed Consistency          | `[ ]`  |  `[P1]`  | Former Phase 15: outbox, singleton jobs, SAGA DLQ, search reconciliation                            |
| **20** | Checkout SAGA & order events                      | `[x]`  |  `[P1]`  | Former 17c - HTTP checkout, BullMQ SAGA, `orders.created` WebSocket                                 |
| **21** | Notifications, Webhooks & Cart Recovery           | `[ ]`  |  `[P2]`  | Former 17a remainder: email, abandoned cart, outbound webhooks                                      |
| **22** | Performance Engineering                           | `[ ]`  |  `[P2]`  | Former Phase 16: k6, V8, RED/USE                                                                    |
| **23** | Analytics Attention & Operational Facts           | `[ ]`  |  `[P2]`  | Former 17d - gated on real payment/storefront traffic                                               |
| **24** | Conditional Enterprise & Infrastructure Evolution | `[ ]`  |  `[P2]`  | Former Phase 18: broker, multi-tenancy, K8s, encrypted off-site backups                             |

### Old → New Mapping

| Old item                                                                           | New phase / track      | Rationale                                             |
| ---------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| Platform hygiene backports                                                         | **15**                 | engines, CI OpenAPI, Action pins, webhook fail-closed |
| Pin Actions SHAs / `timeout-minutes` / redis chaos `forceExit` (tooling backlog)   | **15-B**               | Pulled into P0 hygiene                                |
| 14e remainder (value matrix, C4, Bruno)                                            | **16**                 | Finish onboarding showcase                            |
| Staging / production-like env (old 14 recommended)                                 | **16** track or **19** | Explicit; not lost                                    |
| Money VO (old 17e)                                                                 | **17**                 | Before real Stripe                                    |
| Real Stripe (old 17b)                                                              | **18**                 | After Money; mock fail-closed in 15                   |
| Multi-instance (old 15)                                                            | **19**                 | After pricing/payments correctness                    |
| Commercial loop (old 17c)                                                          | **20**                 | Before email/webhooks                                 |
| Email / cart recovery / webhooks (old 17a remainder)                               | **21**                 | After commercial loop                                 |
| Performance (old 16)                                                               | **22**                 | Preserved                                             |
| Analytics attention (old 17d)                                                      | **23**                 | Gated on traffic                                      |
| Enterprise / K8s (old 18)                                                          | **24**                 | Preserved                                             |
| Catalog GETs (old 17a)                                                             | **Completed**          | Already shipped                                       |
| Staff-audit shopper contract gaps (GET /me, current cart, inventory ACL, 403 code) | **15b** (done)         | Shopper HTTP contract for cart/checkout clients       |

---

## Pre-Production Checklist

### Step 1: Single-Instance Production Ship Blockers

| Task / Item                                                                                | Phase            | Critical Purpose                                                   |
| ------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------ |
| [x] IDOR / object-level access control on carts, orders, payments & customer profile       | **10**           | `CallerContext`, ownership validators, `OwnedResourceAccessPolicy` |
| [x] OWASP audit + Dependabot + blocking `npm audit` + PR dependency review                 | **10** / **12b** | Supply-chain gate                                                  |
| [x] Production error masking & PII log redaction                                           | **10**           | Filter + Winston                                                   |
| [x] OCC + inventory pessimistic lock + cart TTL                                            | **11**           | Data integrity                                                     |
| [x] CQRS read path + admin analytics                                                       | **12**           | N+1 / dashboard reads                                              |
| [x] Baseline migration · Redis degradation · probes · backup/smoke · secret rotation       | **14**           | First private production instance                                  |
| [x] Forced credential rotation                                                             | **14b**          | Bootstrap password change                                          |
| [x] OpenAPI truthfulness tooling                                                           | **14c**          | Contract honesty                                                   |
| [x] Shopper HTTP contract (`/me`, `/carts/current`, inventory ACL, `MUST_CHANGE_PASSWORD`) | **15b**          | Required for checkout-capable HTTP clients                         |

### Step 2: Verification & Test Safety Net

| Task / Item                                                      | Phase  | Critical Purpose           |
| ---------------------------------------------------------------- | ------ | -------------------------- |
| [x] E2E auth + IDOR + SAGA + CQRS shapes + idempotency + cookies | **13** | Pre-deploy HTTP confidence |
| [x] Repository integration + concurrent checkout lock proof      | **13** | Real DB + stock race       |

### Step 3: Multi-Instance (Before 2+ pods)

| Task / Item                              | Phase  | Critical Purpose                    |
| ---------------------------------------- | ------ | ----------------------------------- |
| [ ] Transactional Outbox                 | **19** | At-least-once events across crashes |
| [ ] Singleton jobs & distributed locks   | **19** | One pod runs singleton schedulers   |
| [ ] Checkout SAGA timeout & DLQ recovery | **19** | Stuck checkout compensation         |
| [ ] Product search index reconciliation  | **19** | RedisSearch vs Postgres             |
| [x] User-scoped adaptive rate limiting   | **10** | Already shipped                     |

---

## Phase 15: Platform Hygiene & Supply-Chain Alignment `[P0]`

> **Goal**: Backport hygiene gaps and close the forgeable public Stripe webhook hole. Full Stripe SDK stays Phase 18.
>
> **Parallel tracks**: `15-A` through `15-D` may run concurrently.

### [x] Track 15-A: Node Engines & Migration Script Hygiene

**What**: Align package metadata and TypeORM create scripts.

**Scope**:

- Add `"engines": { "node": ">=24.0.0" }` to `package.json` (README already claims Node 24).
- Fix `migration:create:prod` / `:staging` / `:test` forcing `NODE_ENV=development` (copy-paste).

**Location**: `package.json`

---

### [x] Track 15-B: CI Automation Hardening

**What**: Enforce OpenAPI audit and runner hygiene.

**Scope**:

- Wire `npm run audit:openapi` into GitHub Actions CI.
- Pin GitHub Actions to full commit SHAs + version comments (former tooling backlog).
- Add `timeout-minutes` to long jobs (integration, e2e, redis-chaos).
- Drop Jest `forceExit` from `jest-redis-chaos.json` once open handles are proven clean.

**Location**: `.github/workflows/ci.yml`, `test/integration/redis/jest-redis-chaos.json`

---

### [x] Track 15-C: Fail-Closed Stripe Webhook Signature (Mock Era)

**What**: `POST /v1/payments/webhooks/stripe` is `@Public()` and `StripeSignatureService.verify()` currently returns `true` always - forgeable in any environment that exposes the route.

**Scope**:

- In production (and staging): reject unless a real secret verifies the signature (or disable the route until Phase 18).
- Keep local/test paths explicit (documented bypass only when `NODE_ENV=test` or equivalent).
- Do **not** treat full Stripe SDK / PaymentIntent adapter as P0 - that is Phase 18.
- Optionally rename/clarify mock `StripeGateway` vs real adapter to reduce confusion.

**Location**: `src/modules/payments/secondary-adapters/services/stripe-signature.service.ts`, `payments.controller.ts`, env docs

---

### [x] Track 15-D: Docs Cross-Pollination & CQRS Status Refresh

**What**: Import useful CRM docs; fix stale CQRS current-status text.

**Scope**:

- Copy/adapt `GRAPHQL-EVALUATION.md` and UTC frontend guide from CRM into ecommerce docs.
- Update `docs/architecture/CQRS.md` §2.2 to Phase 2 query adapters (not legacy `toPrimitives()` reads).

**Location**: `docs/architecture/`, `docs/frontend-guides/` (or equivalent)

---

## Phase 16: Complete Developer Onboarding & Architecture Assets `[P0]`

> **Goal**: Finish former Phase 14e remainder so the repo is a showcase reference. Bootstrap (`npm run setup`) is already done.
>
> **Status**: Core deliverables are complete. The recommended staging track below is optional and may move to Phase **19** if only needed before multi-instance demos.

### [x] Architecture Value Matrix & "Why Choose This Engine?" in README

**What**: Decision matrix vs tutorials / Medusa / SaaS monoliths; elevator pitch for CTOs and full-stack engineers.

**Location**: `README.md`, `docs/README.md`

---

### [x] Visual Architecture Diagrams & Media Assets

**What**: C4 context/container SVG; annotated SAGA checkout sequence; Swagger overview screenshot; optional short walkthrough GIF.

**Location**: `docs/assets/`, `README.md`

---

### [x] Interactive API Playground & Client Collection

**What**: Bruno and/or Postman collections under `docs/data/collections/` with token refresh + admin login env; enhance Swagger examples.

**Location**: `docs/data/collections/`, `src/main.ts`

---

### [ ] Staging / Production-Like Environment (Recommended)

**What**: Constrained staging mirroring production topology (former Phase 14 recommended item - not lost).

**Scope**:

- Deploy API + managed Postgres/Redis (Railway/Render/Fly.io or equivalent).
- Public Swagger; protect `/metrics` via API key.
- Run `npm run db:seed`.

**Location**: `scripts/`, `docs/infrastructure/`

> May alternatively land as a track under Phase 19 if staging is only needed before multi-instance demos.

---

## Phase 17: Money & Currency Domain Alignment `[P1]`

> **Goal**: Pricing truth across carts/orders **before** real Stripe. (Bumped from old 17e.)
>
> **MVP foundation already**: cart lines snapshot ISO 4217 currency; mixed currencies rejected; DTOs expose currency.
>
> **HTTP client note**: shipping/tax/discount line items and structured shipping address for honest totals belong here (not in 15b). Until this ships, clients must not invent "Free" shipping without API authority.

### [x] Align Cart/Order Lines on Shared-Kernel `Money`

**What**: Replace raw `price: number` + sibling `currency` on cart (and eventually product write models) with shared-kernel `Money`.

**Scope**:

- `CartItem` stores unit price as `Money`.
- Checkout / order factory maps cart line `Money` without inventing USD defaults.
- Product write path adopts `Money` or keeps explicit DTO mapping so ACL currency stays truthful.
- OpenAPI remains amount + currency fields.

**Location**: `src/shared-kernel/domain/value-objects/money.ts`, `src/modules/carts/`, `src/modules/orders/`, `src/modules/products/`

---

### [ ] Multi-Currency Catalog & FX (Production)

**What**: Multi-market pricing with explicit FX policy.

**Trigger**: Only when business requires non-USD / multi-market.

**Scope**: Store default currency port; cart single-currency policy ADR; FX source/rounding/settlement for Stripe; ADR for major vs minor units.

**Location**: `docs/architecture/adr/`, `src/modules/carts/`, `src/modules/payments/`

---

## Phase 18: Real Stripe SDK Integration & Webhook Idempotency `[P1]`

> **Goal**: Replace mock payment gateway with production Stripe processing. (Bumped from old 17b.)
>
> **Prerequisite**: Phase 15 webhook fail-closed; Phase 17 Money alignment preferred.

### [ ] Real Stripe Integration & Webhook Idempotency

**What**: Stripe SDK adapter + authentic signature verification + event.id dedupe.

**Scope**:

- Stripe SDK secondary adapter for PaymentIntent create/capture/refund.
- Resolve TODO in `stripe-signature.service.ts` with real HMAC verification using webhook secret.
- Persist processed Stripe `event.id` (Redis/DB + TTL) to ignore replays.
- Checkout SAGA (Phase 20) can still run on mock if Stripe is not ready; do not block 20 solely on this.

**Location**: `src/modules/payments/secondary-adapters/stripe/`, `src/modules/payments/secondary-adapters/services/`

---

## Phase 19: Multi-Instance & Distributed Consistency `[P1]`

> **Goal**: Former Phase 15. **Complete before deploying to 2+ application instances.**

### [ ] Transactional Outbox Pattern

**What**: `outbox_events` in the same DB transaction as aggregate mutations; processor with `SKIP LOCKED` / BullMQ; idempotent listeners.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Singleton Background Jobs & Distributed Locking

**What**: BullMQ repeatable locks / Redlock so only one pod runs singleton schedulers (outbox, cart recovery, inventory audit).

**Location**: `src/infrastructure/jobs/`

---

### [ ] Checkout SAGA Timeout & DLQ Recovery Engine

**What**: Max-duration monitor; trigger compensation on orphaned steps; DLQ + Prometheus counters for unrecoverable failures.

**Location**: `src/modules/orders/primary-adapters/jobs/`

---

### [ ] Product Search Index Reconciliation Job

**What**: Periodic Postgres → RedisSearch reconciliation for catalog drift.

**Location**: `src/modules/products/primary-adapters/jobs/`

---

## Phase 20: Checkout SAGA & Order Events `[P1]`

> **Goal**: Former 17c. Stable HTTP checkout command, BullMQ SAGA, and `orders.created` WebSocket broadcast. Placed **before** email/webhooks; works with mock or real Stripe.
>
> **Hard prerequisite:** Shopper HTTP contract **15b** (done).
>
> **Deferred from 15b** (do not block this phase): self-profile PATCH (`manage_own_profile`) `[P1]`; `GET /v1/orders/mine`, register returns tokens, remove unused body `idempotencyKey` `[P2]`. Shipping/tax/discount → **17**. Receipt email → **21**.

### [x] Checkout SAGA & real-time order events

**What**: Verify at the API boundary:

1. `POST /v1/orders/checkout` returns 201 + `orderId`; idempotency and SAGA jobs run.
2. Inventory lock, mock payment, compensation on failure.
3. `GET /v1/orders/{id}` reflects lifecycle states through `confirmed` / `payment_failed` / `cancelled`.
4. WebSocket `orders.created` emitted on successful order creation.

**Client verification**: companion HTTP clients document their own end-to-end checks; this repository does not own app walkthroughs.

**Location**: `src/modules/orders/`, `src/modules/notifications/`

---

## Phase 21: Notifications, Webhooks & Abandoned Cart Engine `[P2]`

> **Goal**: Former 17a remainder (catalog GETs already shipped).
>
> **Storefront note**: do not claim "we emailed a receipt" until order-confirmation email from this phase exists.

### [ ] Real Email and Notification Providers

**What**: Resend/SendGrid adapters; BullMQ outbound mail; order confirmations, password resets, shipping updates.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Cron scan of inactive carts; recovery email links; WebSocket/email on shipping status changes.

**Location**: `src/modules/carts/primary-adapters/jobs/`

---

### [ ] Outbound Webhook Subscription System

**What**: `WebhookSubscription` aggregate; admin CRUD; BullMQ HMAC delivery; `WebhookDeliveryLog`.

**Location**: `src/modules/webhooks/`

---

## Phase 22: Performance Engineering & Observability Maturity `[P2]`

> **Goal**: Former Phase 16. (Role-permission cache already shipped.)

### [ ] k6 Load Testing Baseline

**What**: Auth, catalog, cart, concurrent checkout SAGA; smoke/stress/spike; baselines before CI SLO fails.

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Event loop lag metric; heap dumps; flame graphs under k6.

**New documentation**: `docs/infrastructure/PERFORMANCE-ENGINEERING.md`

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Endpoint SLIs/SLOs; RED/USE dashboards; Alertmanager for 5xx, latency, queue lag, failed jobs.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## Phase 23: Analytics Attention & Operational Facts `[P2]`

> **Goal**: Former 17d. **Trigger**: after real Stripe (18) and live storefront traffic (20).

### [ ] Operational Pulse & Inventory Sell-Through Facts

**What**:

- Add `payment_failed` to attention statuses; expose oldest timestamps.
- Overview KPIs: failed/pending payment counts.
- Low-stock alerts: `unitsSold7d`, expose `reservedQuantity`.

**Location**: `src/modules/analytics/`

---

## Phase 24: Conditional Enterprise & Infrastructure Evolution `[P2]`

> **Goal**: Former Phase 18. Only when product/ops requirements justify it. Builds on Phase 19 outbox.

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Broker transport for outbox processor; consumer groups; DLX; schema versioning.

**New documentation**: `docs/integration/MESSAGE-BROKER-PATTERNS.md`

**Location**: `src/infrastructure/events/broker/`

---

### [ ] Enterprise SaaS Readiness (Multi-Tenancy, Audit Log & Data Exchange)

**What**: Tenant isolation; user permission overrides (if not already sufficient); append-only audit log; CSV/Excel import/export.

**Location**: `src/infrastructure/database/multi-tenancy/`, `src/modules/audit/`, `src/modules/data-exchange/`

---

### [ ] Kubernetes Deployment Configuration & Zero-Downtime Rollouts

**What**: Deployments, Services, Ingress, HPA; canary with SLO rollback.

**New documentation**: `docs/infrastructure/CONTAINER-ORCHESTRATION.md`

**Location**: `k8s/`, `docs/infrastructure/`

---

### [ ] Backup Encryption & Off-Site Cloud Storage

**What**: GPG-encrypt dumps; S3/GCS upload + retention.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

## Engineering Platform & Tooling Backlog

> Future tooling only. Items moved into Phase **15** (Action SHA pins, job timeouts, redis chaos `forceExit`) are tracked there - do not duplicate as pending here once Phase 15 closes them.

- [ ] **Dependency upgrade policy**: `docs/security/DEPENDENCY-UPGRADE-POLICY.md`.
- [/] **Automated architecture linting**: extend `npm run test:arch` with dependency-cruiser and additional layer rules.
- [ ] **Architecture drift detection**: verify module exports and layer dependencies against `docs/architecture/domains/`.
- [ ] **Living architecture dependency graphs**: auto-generate directional dependency maps in CI.
- [ ] **Module architecture scorecards**: per-bounded-context health metrics (entities, repos, events, tests).
- [ ] **ADR validation in CI**: require linked ADR when core architectural policies change.
- [ ] **Modularize CONVENTIONS.md**: split when file exceeds ~500-700 lines.
- [ ] **Property-based domain testing**: evaluate `fast-check` for value-object validation.
- [ ] **Mutation testing**: evaluate Stryker on domain layer.

---

## Skipped (Premature)

| Task                        | Reason                                                                                                                                                                                        | Reconsider When                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| DB Sharding                 | PostgreSQL handles millions of rows with proper indexing (Phase 11). Horizontal partitioning adds massive operational complexity.                                                             | Single-node PostgreSQL becomes the bottleneck after index optimization and read replicas are exhausted.                          |
| Event Sourcing              | State-based persistence with SAGA compensation is correct for e-commerce. Event sourcing adds projection/replay complexity with no current benefit.                                           | Domain requires reconstructing full historical state at any millisecond.                                                         |
| Data Archival               | Only relevant when orders table exceeds ~500K rows.                                                                                                                                           | Database storage costs or list queries degrade due to table size.                                                                |
| GraphQL                     | REST + Swagger is sufficient for current clients. GraphQL adds resolver complexity, N+1 risks, and a new security surface.                                                                    | Multiple frontends need significantly different response shapes from the same data.                                              |
| Microservices               | Modular monolith with ACL gateways and domain events is architecturally ready for extraction. Extraction is an operational decision requiring independent deployment and on-call per service. | A single module needs independent scaling, release cadence, or technology stack.                                                 |
| Full Dual-Database CQRS     | CQRS Phase 2 (dedicated read methods, Phase 12) gives most performance benefit at fraction of complexity. Separate read/write DBs require eventual consistency and projection infrastructure. | Read traffic needs independent horizontal scaling from write traffic, or read latency SLOs cannot be met with a single database. |
| gRPC Internal Communication | REST is sufficient for modular monolith. gRPC shines for inter-service communication with strict contracts and low latency.                                                                   | Microservice extraction happens and services need typed, low-latency internal APIs.                                              |
| Redis Cluster / Sentinel    | Single Redis instance is sufficient until availability, memory, throughput, or failover requirements justify distributed Redis topology.                                                      | Redis becomes a production availability bottleneck or exceeds single-instance capacity.                                          |
