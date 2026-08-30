# ADR-0007: Admin Analytics as Query-Only Composition Module

- **Status**: Accepted
- **Date**: 2026-08-30
- **Deciders**: Engineering Core Team
- **Context**: Admin Control Center Phase 7 operational dashboard
- **Companion**: [domains/ANALYTICS.md](../domains/ANALYTICS.md), [CQRS.md](../CQRS.md)

---

## 1. Context & Problem Statement

The admin SPA needs an operational cockpit (revenue pulse, attention queues, low stock, top products). Prometheus/Grafana answers *system health*; list-endpoint `total` fan-out answers neither money nor period comparisons correctly.

We needed a place for **cross-table read aggregates** without:

1. Inventing revenue in the SPA
2. Polluting Orders/Payments/Inventory **write** aggregates with reporting DTOs
3. Composing overview KPIs via ACL gateway N+1 on the read path

---

## 2. Decision

### Decision 1: Query-only `AnalyticsModule` owns `/v1/admin/analytics/*`

- **Decision**: Introduce `src/modules/analytics/` as a **read composition / reporting** Nest module (no domain aggregates, no commands). Application ports (`AnalyticsQueryService`) + Postgres query adapter perform SQL projections across orders/payments/inventory/order_items tables.
- **Rationale**: Matches CQRS Phase 2 Approach 3 in [CQRS.md](../CQRS.md): cross-context JOINs are allowed in **query adapters** of a single-DB modular monolith; ACL gateways remain command-side only.

### Decision 2: Do not use ACL gateways for dashboard aggregates

- **Decision**: Analytics adapters query Postgres directly. Do not call Orders/Payments application services or ACL ports in a loop.
- **Rationale**: ACL is for write-side anti-corruption; using it for dashboards recreates the N+1 anti-pattern documented in CQRS.md.

### Decision 3: Grafana stays ops-only

- **Decision**: Never feed the admin SPA from `GET /metrics` / Prometheus counters.
- **Rationale**: Counters are ephemeral throughput signals, not financial/stock truth.

### Decision 4: UTC + safeguards in the contract

- **Decision**: Periods/buckets are UTC; max range 90 days; `bucket` enum whitelist; `statement_timeout` on analytics sessions; zero-filled time series.
- **Rationale**: Predictable charts and protection against wide scans / pool saturation.

---

## 3. Consequences

- **Positive**: One overview round-trip shape; stable ports for future MVs; clear Grafana vs in-app split.
- **Trade-off**: Query adapter couples to foreign table schemas (documented pragmatic monolith compromise). Microservice extraction would replace the adapter with batched reads or a projected store—ports stay stable.
- **Note**: [ARCHITECTURE-PRINCIPLES.md](../ARCHITECTURE-PRINCIPLES.md) §4 “no cross-domain JOINs” applies to the **write** path; this ADR + CQRS.md govern analytics reads.
- **Revenue statuses**: Gross/net include `CAPTURED`, `COMPLETED`, `PARTIALLY_REFUNDED`, and `REFUNDED` (net still subtracts `refunded_amount`). See [domains/ANALYTICS.md](../domains/ANALYTICS.md).

---

## 4. Alternatives Rejected

| Alternative | Why rejected |
| --- | --- |
| Endpoints split across Orders/Payments/Inventory only | SPA becomes composer; no shared revenue definition |
| ACL composition for overview | N+1 / wrong tool for reads |
| Prometheus as revenue source | Wrong semantics and lifecycle |
