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
  - Idempotency → fail-open (treat as new request; documented tradeoff)
  - Throttler → in-memory per-instance limits
  - BullMQ → jobs pause until Redis returns
  - Socket.IO → in-memory adapter fallback
  - `/health/readiness` → Postgres only; Redis reported on `/health` and metrics
- **Rationale**: Treating Redis as a single hard dependency would take the app out of rotation for an optional accelerator and incorrectly couple rate limits, queues, and cache.

### Decision 4: Invalidate cache via generation bump, not SCAN flush

- **Decision**: Versioned cache keys use `{REDIS_KEYPREFIX}c{generation}:{logicalKey}` for domain `*_cache`, `*_index`, and `*_list:isCached`. Generation is an `INCR` on stable `meta:cache_generation`, bumped on successful connect and on reconnect recovery. Old keys expire via TTL. Idempotency and meta keys are **not** versioned. Recovery clears list flags and re-inits RediSearch indexes for the new generation.
- **Rationale**: SCAN+DEL on reconnect is O(keyspace), races with writers, and is unnecessary when a generation segment orphans the old namespace cheaply.

### Decision 5: Slim Redis layering + shared connection options

- **Decision**: `RedisService` owns connection lifecycle and typed client ops; `CacheService` implements `CachePort` as the application cache API. Remove thin pass-through JSON/Key/Search clients. Centralize host/port/password/db/reconnect in `redis-connection.options.ts`. Separate TCP clients may remain (library constraints) but must share that factory. Prefer atomic JSON write + TTL via `MULTI` where the typed client lacks `JSON.SET EX`.
- **Rationale**: Fewer wrappers, one fail-open boundary, one place to change connection policy.

---

## 3. Alternatives Considered

1. **Keep `createHealthAwareProxy`**:  
   _Rejected_ — redundant with fail-open cache-aside; hides the real contract (cached repo always DB-backed); unusual vs industry cache-aside.
2. **Fail closed (5xx when Redis down)**:  
   _Rejected_ — Redis is not required for correct domain reads/writes; would violate Phase 14 ship-gate degradation goals.
3. **Reconnect `SCAN` + delete all domain keys**:  
   _Rejected_ — cost and operational risk; generation bump achieves stale-data avoidance with TTL cleanup.
4. **Single shared Redis TCP connection for all libraries**:  
   _Rejected for now_ — BullMQ/throttler/Socket.IO client libraries expect their own connections; sharing options is enough for Phase 14. Unifying sockets is out of scope.
5. **Version every Redis key including idempotency**:  
   _Rejected_ — bumping generation must not invalidate in-flight idempotency locks; those stay on a stable prefix.

---

## 4. Consequences

### Positive

- Redis outage does not take the API out of readiness or turn cache misses into 5xx for domain CRUD.
- One degradation story for cache: miss → Postgres.
- Reconnect recovery is O(1) generation bump + flag clears + index ensure, not full keyspace SCAN.
- Connection settings are consistent across clients; docs name Redis roles and failure modes explicitly.

### Negative

- Fail-open idempotency is not exactly-once under Redis loss (accepted Phase 14 tradeoff; optional HTTP hardening remains P2).
- Throttler memory fallback is per-instance (weaker under multi-instance until Redis returns).
- Generation bumps leave orphaned keys until TTL; acceptable for single-instance, monitor memory if TTLs are long.
- Multiple Redis TCP clients remain (ops surface).

### Follow-through (not part of the decision)

- Implementation: `src/infrastructure/redis/`, module DI bindings, [REDIS.md](../../infrastructure/REDIS.md), Phase 14 checklist in [ROADMAP.md](../../ROADMAP.md).
- Out of scope: Redis Cluster/Sentinel, merging client libraries onto one socket, changing idempotency to fail-closed, Phase 15 search reconciliation.
