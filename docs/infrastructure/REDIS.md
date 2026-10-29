# Redis Infrastructure

How this API uses Redis across concerns, how keys are namespaced, and what happens when Redis is unavailable.

**Why**: [ADR-0006](../architecture/adr/ADR-0006-redis-fail-open-cache-aside.md): fail-open cache-aside, fail-closed idempotency, generation invalidation, shared connection options.

## Roles

| Role                                                              | Library / entrypoint                                                                                                                                        | Key prefix                                            | Failure mode                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Cache-aside (users, products, inventory, orders, payments, carts) | `node-redis` via [`RedisService`](../../src/infrastructure/redis/redis.service.ts) + [`CachePort`](../../src/shared-kernel/domain/interfaces/cache.port.ts) | `REDIS_KEYPREFIX` + `c{generation}:`                  | Fail-open → PostgreSQL                                   |
| Cart RedisJSON                                                    | Same cache stack (long TTL); Postgres remains fallback                                                                                                      | Versioned cache keys                                  | Fail-open → Postgres / auto-create                       |
| Idempotency locks                                                 | `CachePort` (`idempotency:*`)                                                                                                                               | `REDIS_KEYPREFIX` only (**not** generation-versioned) | **Fail-closed** → HTTP 503 (do not execute side effects) |
| Rate limiting                                                     | `ioredis` in [`throttler.module.ts`](../../src/infrastructure/throttler/throttler.module.ts)                                                                | Library keys (no app prefix)                          | In-memory per-instance limits                            |
| BullMQ jobs                                                       | BullMQ (ioredis under the hood)                                                                                                                             | `REDIS_KEYPREFIX`                                     | Jobs pause / fail until Redis returns                    |
| Socket.IO adapter                                                 | `node-redis` pub/sub in [`redis-io.adapter.ts`](../../src/infrastructure/websocket/adapters/redis-io.adapter.ts)                                            | N/A                                                   | Falls back to in-memory adapter                          |

PostgreSQL is the source of truth for domain aggregates. Redis is optional for readiness: `/health/readiness` requires Postgres only; Redis status is reported on `/health` and metrics.

## Client inventory

Separate TCP sockets are **intentional** (ADR-0006 Decision 5 / Alternative 5). Libraries and modes cannot share one connection safely.

| Role                                                 | Library                         | Typical sockets                           | Why separate                                                                                            |
| ---------------------------------------------------- | ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cache / RedisJSON / RediSearch / idempotency         | `node-redis` via `RedisService` | 1                                         | Command client; owns generation + typed JSON/FT ops                                                     |
| Socket.IO adapter                                    | `node-redis`                    | 2 (pub + dedicated sub via `duplicate()`) | Subscriber mode cannot share the cache command client                                                   |
| Rate limiting                                        | `ioredis`                       | 1                                         | Fail-fast retries (`enableOfflineQueue: false`); conflicts with BullMQ worker settings                  |
| BullMQ queues / workers / FlowProducer / QueueEvents | BullMQ → `ioredis`              | N (one per Queue/Worker/Events/Flow)      | Blocking ops + `maxRetriesPerRequest: null` for workers; options shared via `BULLMQ_CONNECTION_OPTIONS` |

All paths build host/port/password/db/reconnect from [`redis-connection.options.ts`](../../src/infrastructure/redis/redis-connection.options.ts).

## Architecture

```
Domain modules → Cached*Repository → CachePort (shared-kernel)
IdempotencyService ──────────────────┘
                                      ↓ CacheService adapter
                               RedisService (connection + typed client)
```

- **`CachePort` lives in shared-kernel** (driven port for KV + RediSearch). Methods: `get`/`getMany`/`set`/`setAll`/`delete`/`search`. Callers pass a type parameter (`get<ProductForCache>`, `search<OrderForCache>`); `*CacheMapper.fromCache` maps the wire DTO to the domain entity (corrupt / invalid payload → `null` → treat as miss → Postgres). Wire dates are epoch milliseconds. `CacheService` is the Redis adapter; readiness is `CachePort.isAvailable()` so adapters like idempotency never inject `RedisService`. Do **not** merge `CacheService` into `RedisService`: that would put the port implementation inside the vendor client.
- **One fail-open boundary for cache**: `CacheService` / `RedisService` command helpers return null/false/[] on outage. Cached repositories treat that as a miss and use Postgres.
- **Idempotency is fail-closed**: if the cache is unavailable (`!isAvailable()` / set fails) or cannot persist the completed body, checkout returns **503** so clients retry safely.
- **No health-aware DI Proxy**: modules bind `*Repository` to the cached implementation directly.
- **Shared connection options**: factory above; separate TCP clients remain (see client inventory).

## Cache generation invalidation

Versioned namespaces (domain `*_cache`, `*_index`, `*_list:isCached`) are stored as:

`{REDIS_KEYPREFIX}c{generation}:{logicalKey}`

- Generation is persisted at stable key `{REDIS_KEYPREFIX}meta:cache_generation` and **INCR**'d on:
  - successful Redis connect at startup
  - reconnect recovery ([`RedisCacheRecoveryService`](../../src/infrastructure/redis/redis-cache-recovery.service.ts))
- After a bump, new reads/writes use the new generation; previous **document** keys expire via TTL (no `SCAN` flush).
- Prior-generation **RediSearch indexes** are dropped (`FT.DROPINDEX`) on bump; indexes for the new generation are re-created.
- Recovery also clears list-cache flags.
- **Not versioned**: `idempotency:*`, `meta:*`.

## Observability

| Metric                                                | Type     | Meaning                      |
| ----------------------------------------------------- | -------- | ---------------------------- |
| `redis_health_status`                                 | gauge    | 1 = ready, 0 = down          |
| `redis_cache_generation`                              | gauge    | Current key-space generation |
| `redis_cache_hits_total` / `redis_cache_misses_total` | counters | CachePort get/getMany        |
| `redis_cache_recovery_failures_total`                 | counter  | Reconnect recovery failures  |
| `throttler_storage_degraded`                          | gauge    | In-memory throttle fallback  |

## Atomic JSON + TTL

`jsonSet` with a TTL uses a Redis `MULTI` so set and `EXPIRE` commit together. Typed `JSON.SET` in node-redis does not expose `EX`, so MULTI is the atomic path.

## Chaos / reconnect proof

Redis Stack Testcontainers suite (separate from Postgres integration):

```bash
npm run test:redis:chaos
```

Requires Docker. Harness: `test/integration/redis/`. Spec kills Redis clients under `CachePort` traffic (`CLIENT KILL`) to force reconnect, asserts fail-open during the outage, then checks generation bump, list-flag clear, and stable idempotency keys.

## BullMQ v6 migration

Cron jobs (inventory reconciliation, reservation sweeper, notifications cleanup, expire pending orders) use Job Schedulers (`Queue.upsertJobScheduler`). BullMQ v5 `Queue.add(..., { repeat })` left legacy repeatable entries in Redis under hashed keys. BullMQ v6 does not support them and would keep them running next to the named schedulers (each cron would fire twice), so they must be removed while the app still runs bullmq 5 ([official guide](https://docs.bullmq.io/guide/migrations/migrate-from-v5-to-v6)).

The cleanup script only exists in the bullmq 5 release: bullmq 6 removed `Queue.getRepeatableJobs` and `Queue.removeRepeatableByKey`, so it was deleted together with the upgrade.

Order, per environment with persistent Redis:

1. Stop every running instance of the old release (API and workers). Pausing workers is not enough: the old release re-adds legacy repeatables on boot, and scheduler initialization can still enqueue jobs.
2. From a checkout of the bullmq 5 release that uses `upsertJobScheduler` (develop at `22a31bf`, #373), dry run against the target environment: `NODE_ENV=<environment> npm run queue:clean-legacy-repeatables`. For each queue (`inventory`, `notifications`, `checkout`) it prints one line with the counts (`legacy=`, `removed=`, `schedulers kept=`) followed by the key of every legacy entry; kept Job Schedulers appear only as a count.
3. Remove, with the same environment: `NODE_ENV=<environment> node scripts/bullmq-clean-legacy-repeatables.js --yes`. Re-running is safe; a clean queue reports `legacy=0`.
4. Start the new version (`22a31bf`, or 0.13.0 with bullmq 6 directly). On boot it creates the named Job Schedulers. Because no legacy entry is left, each cron fires once.

Select the target explicitly for both commands, and confirm it before running them. The script calls `loadEnv()` (`scripts/lib/cli.js`), which uses `NODE_ENV` (default `development`) and loads only the first file that exists out of `.env.<NODE_ENV>`, `.env.production`, `.env`. A missing `.env.<NODE_ENV>` is not an error: `NODE_ENV=staging` without `.env.staging` silently loads `.env.production` and cleans the **production** Redis, and without `NODE_ENV` a checkout that has `.env.development` cleans the development Redis. The script does not print which file it loaded or which Redis host it connects to (only the key prefix), so use one of these:

- `.env.<environment>` must exist in the checkout before you run with `NODE_ENV=<environment>`. Check it (`ls .env.<environment>`) and read its `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, and `REDIS_KEYPREFIX` first.
- Or export the target `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`, `REDIS_TLS`, and `REDIS_KEYPREFIX` in the shell: variables already set are not overridden by whichever env file loads.

Then check the dry run's first line: it prints the key prefix (`prefix '...'`), which must be the target environment's `REDIS_KEYPREFIX`. A Job Scheduler is recognised by the iteration count that only `upsertJobScheduler` writes; everything else in the repeat set is legacy.

## Related docs

- Phase 14 graceful degradation scope: [`docs/ROADMAP.md`](../ROADMAP.md)
- Process lifecycle / shutdown: [`PROCESS-LIFECYCLE.md`](./PROCESS-LIFECYCLE.md)
