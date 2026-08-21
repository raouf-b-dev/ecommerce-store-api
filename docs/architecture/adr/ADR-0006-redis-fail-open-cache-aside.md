# ADR-0006: Redis Fail-Open Cache-Aside & Key-Space Generation

- **Status**: Accepted
- **Date**: 2026-08-21
- **Deciders**: Engineering Core Team
- **Context**: Phase 14 single-instance production gate — Redis graceful degradation and infrastructure cleanup
- **Companion how-to**: [REDIS.md](../../infrastructure/REDIS.md)

---

## 1. Context & Problem Statement

Redis is used for several unrelated roles: cache-aside, cart RedisJSON acceleration, idempotency locks, rate-limit storage, BullMQ, and Socket.IO pub/sub. Phase 14 required the API to keep serving traffic when Redis is unavailable (Postgres remains the source of truth for domain aggregates).

The stack had grown overlapping resilience mechanisms:

1. `RedisService` methods already fail-open (`null` / `false` / `[]` when not ready or on error).
2. A DI-level `createHealthAwareProxy` swapped cached vs Postgres repositories based on `redis.isReady()`.
3. Reconnect recovery `SCAN`’d and deleted domain cache keys — expensive and risky at scale.
4. Thin pass-through clients (`RedisJsonClient`, `RedisKeyClient`, `RedisSearchClient`) duplicated layering without a second implementation.
5. Connection host/port/password/db/reconnect were copy-pasted across node-redis, ioredis (throttler), BullMQ, and Socket.IO.

We needed to record **why** we collapse to one degradation model, how invalidation works without SCAN, and why Redis remains optional for readiness.

This ADR records **why**. Operational detail lives in [REDIS.md](../../infrastructure/REDIS.md).

---

## 2. Decision Outcomes

### Decision 1: Postgres is SoR; Redis cache-aside fails open at `CachePort`

- **Decision**: Domain modules bind `*Repository` to `Cached*Repository` only. Cached repos always hold the Postgres adapter. `CachePort` / `RedisService` never throw to callers on Redis outage — they return miss-like empties. A cache miss or Redis-down is the same path: load/save via Postgres. Writes persist to Postgres first; cache updates are best-effort.
- **Rationale**: Standard cache-aside. Use cases stay Redis-unaware. One policy is easier to reason about than DI switching plus per-command guards.

### Decision 2: Remove health-aware DI Proxy

- **Decision**: Delete `createHealthAwareProxy`. Do not route repository tokens by `isReady()` at module factories.
- **Rationale**: The Proxy duplicated Decision 1. When Redis was “not ready”, it skipped the cache layer; when “ready” but a command failed, the cached repo already fell back. Two mechanisms, same end state, more DI complexity and harder tests.

### Decision 3: Per-concern degradation (not one global Redis policy)

- **Decision**: Redis-down is handled per role:
  - Cache-aside / cart RedisJSON → Postgres (Decision 1)
  - Idempotency → **fail-closed** (HTTP 503; do not run the side-effecting handler; do not treat lock failure as a new request)
  - Throttler → in-memory per-instance limits
  - BullMQ → jobs pause until Redis returns
  - Socket.IO → in-memory adapter fallback
  - `/health/readiness` → Postgres only; Redis reported on `/health` and metrics
- **Rationale**: Cache can degrade safely. Idempotent checkout cannot — fail-open under Redis loss risks duplicate side effects. Rate limits and queues have different operational tradeoffs.

### Decision 4: Invalidate cache via generation bump, not SCAN flush

- **Decision**: Versioned cache keys use `{REDIS_KEYPREFIX}c{generation}:{logicalKey}` for domain `*_cache`, `*_index`, and `*_list:isCached`. Generation is an `INCR` on stable `meta:cache_generation`, bumped on successful connect and on reconnect recovery. Old document keys expire via TTL. Prior-generation RediSearch indexes are **dropped** (`FT.DROPINDEX`); new indexes are created for the current generation. Idempotency and meta keys are **not** versioned. Recovery clears list flags.
- **Rationale**: SCAN+DEL on reconnect is O(keyspace). Generation orphans documents cheaply; dropping old indexes prevents RediSearch metadata buildup across restarts.

### Decision 5: Slim Redis layering + shared connection options

- **Decision**: `RedisService` owns connection lifecycle and typed client ops; `CachePort` lives in shared-kernel as the driven port; `CacheService` implements it. Availability is `CachePort.isAvailable()` (not raw `RedisService` injected into callers such as idempotency). Remove thin pass-through JSON/Key/Search clients. Centralize host/port/password/db/reconnect in `redis-connection.options.ts`. Separate TCP clients may remain (library constraints) but must share that factory. Prefer atomic JSON write + TTL via `MULTI` where the typed client lacks `JSON.SET EX`.
- **Rationale**: Fewer wrappers, one fail-open boundary, hexagonal dependency rule (adapters depend on ports, not Redis connection details), one place to change connection policy.

---

## 3. Alternatives Considered

1. **Keep `createHealthAwareProxy`**:  
   _Rejected_ — redundant with fail-open cache-aside; hides the real contract (cached repo always DB-backed); unusual vs industry cache-aside.
2. **Fail closed for all Redis roles (5xx when Redis down)**:  
   _Rejected_ — would take the app out of rotation for an optional cache; readiness correctly requires Postgres only.
3. **Fail-open idempotency (treat Redis errors as new requests)**:  
   _Rejected_ — risks duplicate checkout side effects; fail-closed (503) is the correct tradeoff for `@Idempotent()` commands.
4. **Reconnect `SCAN` + delete all domain keys**:  
   _Rejected_ — cost and operational risk; generation bump achieves stale-data avoidance with TTL cleanup; prior indexes are dropped explicitly.
5. **Single shared Redis TCP connection for all libraries**:  
   _Rejected for now_ — BullMQ/throttler/Socket.IO client libraries expect their own connections; sharing options is enough for Phase 14. Unifying sockets is out of scope.
6. **Version every Redis key including idempotency**:  
   _Rejected_ — bumping generation must not invalidate in-flight idempotency locks; those stay on a stable prefix.

---

## 4. Consequences

### Positive

- Redis outage does not take the API out of readiness or turn cache misses into 5xx for domain CRUD.
- One degradation story for cache: miss → Postgres.
- Idempotent commands fail closed (503) when Redis cannot lock or persist results — safer than duplicate checkouts.
- Reconnect recovery is generation bump + prior index drop + flag clears + index ensure, not full keyspace SCAN.
- Prometheus exposes Redis health, generation, cache hit/miss, and recovery failures.
- Connection settings are consistent across clients; docs name Redis roles and failure modes explicitly.

### Negative

- Checkout and other `@Idempotent()` routes require Redis (503 until Redis returns) — intentional correctness over availability for those commands.
- Throttler memory fallback is per-instance (weaker under multi-instance until Redis returns).
- Generation bumps leave orphaned JSON keys until TTL; indexes are dropped. Monitor memory if TTLs are long.
- Multiple Redis TCP clients remain (ops surface).

### Follow-through (not part of the decision)

- Implementation: `src/infrastructure/redis/`, idempotency interceptor, module DI bindings, [REDIS.md](../../infrastructure/REDIS.md), Phase 14 checklist in [ROADMAP.md](../../ROADMAP.md).
- Out of scope: Redis Cluster/Sentinel, merging client libraries onto one socket, Phase 15 search reconciliation.
