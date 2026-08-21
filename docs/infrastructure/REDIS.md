# Redis Infrastructure

How this API uses Redis across concerns, how keys are namespaced, and what happens when Redis is unavailable.

**Why**: [ADR-0006](../architecture/adr/ADR-0006-redis-fail-open-cache-aside.md) — fail-open cache-aside, no health-aware Proxy, generation invalidation, shared connection options.

## Roles

| Role                                                              | Library / entrypoint                                                                                                                                   | Key prefix                                            | Failure mode                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------- |
| Cache-aside (users, products, inventory, orders, payments, carts) | `node-redis` via [`RedisService`](../../src/infrastructure/redis/redis.service.ts) + [`CachePort`](../../src/infrastructure/redis/cache/cache.port.ts) | `REDIS_KEYPREFIX` + `c{generation}:`                  | Fail-open → PostgreSQL                |
| Cart RedisJSON                                                    | Same cache stack (long TTL); Postgres remains fallback                                                                                                 | Versioned cache keys                                  | Fail-open → Postgres / auto-create    |
| Idempotency locks                                                 | `CachePort` (`idempotency:*`)                                                                                                                          | `REDIS_KEYPREFIX` only (**not** generation-versioned) | Fail-open (treat as new request)      |
| Rate limiting                                                     | `ioredis` in [`throttler.module.ts`](../../src/infrastructure/throttler/throttler.module.ts)                                                           | Library keys (no app prefix)                          | In-memory per-instance limits         |
| BullMQ jobs                                                       | BullMQ (ioredis under the hood)                                                                                                                        | `REDIS_KEYPREFIX`                                     | Jobs pause / fail until Redis returns |
| Socket.IO adapter                                                 | `node-redis` pub/sub in [`redis-io.adapter.ts`](../../src/infrastructure/websocket/adapters/redis-io.adapter.ts)                                       | N/A                                                   | Falls back to in-memory adapter       |

PostgreSQL is the source of truth for domain aggregates. Redis is optional for readiness: `/health/readiness` requires Postgres only; Redis status is reported on `/health` and metrics.

## Architecture

```
Domain modules → Cached*Repository → CachePort (CacheService)
                                      ↓ fail-open
                               RedisService (connection + typed client)
```

- **One fail-open boundary**: `CacheService` / `RedisService` command helpers return null/false/[] on outage. Cached repositories treat that as a miss and use Postgres.
- **No health-aware DI Proxy**: modules bind `*Repository` to the cached implementation directly.
- **Shared connection options**: [`redis-connection.options.ts`](../../src/infrastructure/redis/redis-connection.options.ts) builds host/port/password/db/reconnect for `node-redis` and `ioredis`. Separate TCP clients remain (library constraints); settings are not duplicated ad hoc.

## Cache generation invalidation

Versioned namespaces (domain `*_cache`, `*_index`, `*_list:isCached`) are stored as:

`{REDIS_KEYPREFIX}c{generation}:{logicalKey}`

- Generation is persisted at stable key `{REDIS_KEYPREFIX}meta:cache_generation` and **INCR**’d on:
  - successful Redis connect at startup
  - reconnect recovery ([`RedisCacheRecoveryService`](../../src/infrastructure/redis/redis-cache-recovery.service.ts))
- After a bump, new reads/writes use the new generation; previous keys expire via TTL (no `SCAN` flush).
- Recovery also clears list-cache flags and re-runs RediSearch index initialization for the new generation.
- **Not versioned**: `idempotency:*`, `meta:*`.

## Atomic JSON + TTL

`jsonSet` / `jsonMerge` with a TTL use a Redis `MULTI` so set/merge and `EXPIRE` commit together. Typed `JSON.SET` in node-redis does not expose `EX`, so MULTI is the atomic path.

## Related docs

- Phase 14 graceful degradation scope: [`docs/ROADMAP.md`](../ROADMAP.md)
- Process lifecycle / shutdown: [`PROCESS-LIFECYCLE.md`](./PROCESS-LIFECYCLE.md)
