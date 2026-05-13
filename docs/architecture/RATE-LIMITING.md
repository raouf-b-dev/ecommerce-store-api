# Rate Limiting & Throttling — Strategy & Reference

A comprehensive guide to API rate limiting and throttling for RESTful services. Covers the distinction between rate limiting and throttling, algorithm selection, tiered enforcement strategies, storage backends, response conventions, and common anti-patterns.

> _This document is designed to be consumed by any engineering team. It is not tied to a specific project or codebase._

---

## 1. Terminology

Rate limiting and throttling are often used interchangeably, but they describe different mechanisms:

| Concept           | Definition                                                                                                                              | Analogy                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Rate Limiting** | Capping the total number of requests a client can make within a time window. After the limit is reached, further requests are rejected. | A nightclub with a maximum capacity — once full, no one enters. |
| **Throttling**    | Slowing down or queuing requests that exceed a threshold, rather than outright rejecting them.                                          | A highway on-ramp meter — cars are paced, not turned away.      |
| **Quota**         | A long-term limit (daily, monthly) on total API usage, typically enforced per subscription tier.                                        | A monthly data cap on a mobile plan.                            |

In practice, most implementations use **rate limiting with hard rejection** (HTTP 429) rather than throttling with queuing. This document covers both but focuses on the more common rejection-based approach.

---

## 2. Why Rate Limit?

Rate limiting protects your system from several categories of abuse and failure:

| Threat                           | How Rate Limiting Helps                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| **Brute-force attacks**          | Caps login/registration attempts, making credential stuffing impractical        |
| **DDoS mitigation**              | Limits blast radius by capping per-client throughput                            |
| **Resource exhaustion**          | Prevents a single tenant from monopolizing CPU, memory, or database connections |
| **Fairness (multi-tenancy)**     | Ensures equitable access across tenants in a shared infrastructure              |
| **Cost control**                 | Prevents runaway usage from inflating cloud bills                               |
| **Cascading failure prevention** | Stops upstream overload from propagating to downstream services                 |

> _"Rate limiting is a reliability pattern, not just a security pattern. It protects the system from itself as much as from external threats."_
> — Betsy Beyer et al., _Site Reliability Engineering_ (O'Reilly, 2016)

---

## 3. Algorithms

### 3.1 Fixed Window

Counts requests in fixed time intervals (e.g., per calendar minute). Resets at the boundary.

```text
Window: [12:00:00 – 12:01:00]  →  87 requests  ✅ (limit: 100)
Window: [12:01:00 – 12:02:00]  →  0 requests (counter reset)
```

| Pros                             | Cons                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Simple to implement              | **Burst at boundaries** — 100 requests at 12:00:59 + 100 at 12:01:00 = 200 in 2 seconds |
| Low memory (one counter per key) | Unfair to clients who start mid-window                                                  |

### 3.2 Sliding Window Log

Records the timestamp of every request. Counts how many fall within the trailing window.

| Pros                                | Cons                                     |
| ----------------------------------- | ---------------------------------------- |
| Precise — no boundary burst problem | **High memory** — stores every timestamp |
| Fair across all clients             | Expensive to compute at high throughput  |

### 3.3 Sliding Window Counter (Recommended)

A hybrid of fixed window and sliding window. Estimates the count in the current sliding window using weighted averages from the current and previous fixed windows.

```text
Previous window count: 80
Current window count:  30
Current window elapsed: 40%

Estimated sliding count = 30 + (80 × 60%) = 30 + 48 = 78  ✅ (limit: 100)
```

| Pros                               | Cons                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Low memory (two counters per key)  | Slight approximation (acceptable for most use cases) |
| No boundary burst problem          | Marginally more complex than fixed window            |
| Used by Cloudflare, Stripe, GitHub | —                                                    |

### 3.4 Token Bucket

A bucket holds tokens; each request consumes one. Tokens refill at a fixed rate. Allows controlled bursts up to the bucket capacity.

```text
Bucket capacity: 10 tokens
Refill rate: 1 token/second

→ Client can burst 10 requests instantly, then must wait 1s between requests.
```

| Pros                            | Cons                                            |
| ------------------------------- | ----------------------------------------------- |
| Allows controlled bursts        | More complex state management                   |
| Smooth rate enforcement         | Harder to explain to API consumers              |
| Used by AWS API Gateway, Stripe | Two parameters to tune (capacity + refill rate) |

### 3.5 Leaky Bucket

Requests enter a FIFO queue (the bucket). They are processed at a fixed rate. If the queue is full, new requests are dropped.

| Pros                                  | Cons                                       |
| ------------------------------------- | ------------------------------------------ |
| Produces perfectly smooth output rate | Adds latency (queuing)                     |
| Simple conceptual model               | Old requests may become stale in the queue |

### 3.6 Algorithm Selection Guide

| Use Case                       | Recommended Algorithm                      |
| ------------------------------ | ------------------------------------------ |
| General API rate limiting      | **Sliding Window Counter**                 |
| APIs that need burst tolerance | **Token Bucket**                           |
| Simple internal services       | **Fixed Window**                           |
| Real-time/streaming APIs       | **Leaky Bucket**                           |
| Billing/quota enforcement      | **Sliding Window Log** (precision matters) |

---

## 4. Tiered Rate Limits

### 4.1 Why Tiers?

Not all endpoints carry equal risk. A product listing endpoint can tolerate high throughput, while a login endpoint must be tightly constrained to prevent brute-forcing.

### 4.2 Recommended Tier Structure

| Tier                 | Typical Limit    | Applied To                                            | Rationale                                       |
| -------------------- | ---------------- | ----------------------------------------------------- | ----------------------------------------------- |
| **Global (default)** | 100–300 req/min  | All endpoints unless overridden                       | General protection against abuse                |
| **Strict**           | 5–20 req/min     | Login, registration, password reset, token refresh    | Brute-force protection for credential endpoints |
| **Relaxed**          | 500–1000 req/min | Public read-only endpoints (catalog, search)          | High-traffic, low-risk operations               |
| **Critical**         | 1–5 req/min      | Password change, account deletion, payment submission | Irreversible or high-impact operations          |
| **Exempt**           | No limit         | Health checks, metrics, internal service-to-service   | Infrastructure probes must never be throttled   |

### 4.3 Implementation Pattern (NestJS)

```typescript
// Global — applied automatically via APP_GUARD
ThrottlerModule.forRoot({
  throttlers: [
    { name: 'default', ttl: seconds(60), limit: 100 },
    { name: 'strict',  ttl: seconds(60), limit: 10  },
  ],
});

// Per-endpoint override — stricter than global
@Throttle({
  default: { limit: 10, ttl: 60000 },
  strict:  { limit: 10, ttl: 60000 },
})
@Post('login')
async login(@Body() dto: LoginDto) { ... }

// Exempt from throttling entirely
@SkipThrottle()
@Get('health')
async healthCheck() { ... }
```

---

## 5. Storage Backends

### 5.1 In-Memory

Stores counters in the application process memory.

| Pros              | Cons                                                               |
| ----------------- | ------------------------------------------------------------------ |
| Zero dependencies | **Not shared across instances** — each replica has its own counter |
| Lowest latency    | Lost on restart                                                    |

**Use when**: Single-instance development/testing only.

### 5.2 Redis (Recommended for Production)

Stores counters in a shared Redis instance.

| Pros                                    | Cons                          |
| --------------------------------------- | ----------------------------- |
| Shared across all application instances | Adds a network hop (~1ms)     |
| Survives application restarts           | Requires Redis infrastructure |
| Atomic operations via `INCR` + `EXPIRE` | —                             |

**Use when**: Multi-instance production deployments, Kubernetes, auto-scaled environments.

### 5.3 Redis Lifecycle Management

When using Redis as a throttler backend, the connection must be properly managed:

```typescript
// ✅ CORRECT — managed client with lifecycle hooks
const client = new Redis({ host, port, password, db });
client.on('error', (err) => Logger.error('Throttler Redis error', err));

// On module destroy:
await client.quit(); // graceful shutdown
```

```typescript
// ❌ WRONG — inline, unmanaged client
storage: new ThrottlerStorageRedis(new Redis({ ... }))
// No error handling, no graceful shutdown, connection leak on restart
```

### 5.4 Database-Backed

Stores counters in a relational database (PostgreSQL, MySQL).

| Pros                         | Cons                              |
| ---------------------------- | --------------------------------- |
| No additional infrastructure | High latency per request          |
| Durable                      | Adds load to the primary database |

**Use when**: Redis is unavailable and rate limiting is still needed (rare).

---

## 6. HTTP Response Conventions

### 6.1 Status Code: `429 Too Many Requests`

When a client exceeds the rate limit, respond with HTTP `429`. This is defined in [RFC 6585 §4](https://datatracker.ietf.org/doc/html/rfc6585#section-4).

### 6.2 Required Headers

Every rate-limited response should include these headers to help clients self-regulate:

| Header                  | Description                                         | Example      |
| ----------------------- | --------------------------------------------------- | ------------ |
| `X-RateLimit-Limit`     | Maximum requests allowed in the window              | `100`        |
| `X-RateLimit-Remaining` | Requests remaining in the current window            | `47`         |
| `X-RateLimit-Reset`     | Unix timestamp when the window resets               | `1620000060` |
| `Retry-After`           | Seconds until the client should retry (on 429 only) | `30`         |

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1620000060
Retry-After: 30
Content-Type: application/json

{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 30
}
```

### 6.3 Rate Limit Headers on Success Responses

Best practice is to include `X-RateLimit-*` headers on **every** response (not just 429s), so clients can proactively adapt before hitting the limit:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1620000060
```

> The IETF is standardizing these headers via [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) and the [RateLimit header fields draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/).

---

## 7. Keying Strategies

Rate limits must be scoped to an identity. The key determines _who_ is being limited:

| Key              | Use Case                        | Pros                          | Cons                                                        |
| ---------------- | ------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| **IP Address**   | Unauthenticated endpoints       | Simple, no auth required      | Shared IPs (NAT, corporate proxies) penalize innocent users |
| **API Key**      | Public APIs with key-based auth | Precise per-consumer tracking | Requires key management infrastructure                      |
| **User ID**      | Authenticated endpoints         | Accurate per-user limiting    | Requires authentication to have already succeeded           |
| **IP + User ID** | Defense in depth                | Covers both auth and pre-auth | More complex key management                                 |
| **Tenant ID**    | Multi-tenant SaaS               | Fair per-tenant limiting      | Requires tenant context extraction                          |

> **Best practice**: Use **IP** for unauthenticated endpoints (login, registration) and **User ID** or **Tenant ID** for authenticated endpoints.

---

## 8. Architecture Placement

### 8.1 Where to Enforce

Rate limiting can be enforced at multiple layers. Each layer serves a different purpose:

```text
┌──────────────────────────────────────────────────────┐
│  CDN / Edge (Cloudflare, AWS CloudFront)              │ ← DDoS protection
├──────────────────────────────────────────────────────┤
│  API Gateway / Load Balancer (NGINX, Kong, AWS ALB)   │ ← Global rate limiting
├──────────────────────────────────────────────────────┤
│  Application Middleware (NestJS Guard, Express MW)     │ ← Per-endpoint tiering
├──────────────────────────────────────────────────────┤
│  Service Layer                                        │ ← Business-rule quotas
└──────────────────────────────────────────────────────┘
```

**Recommended**: Enforce at the **application layer** for granular per-endpoint control, backed by **Redis** for distributed state. Add edge/gateway limiting as an additional defense layer in production.

### 8.2 Layered Architecture Alignment

Rate limiting is an **infrastructure/cross-cutting concern**. It should be implemented as a global guard or middleware, not embedded in business logic:

- ✅ Global guard registered via `APP_GUARD` (NestJS) or middleware (Express)
- ✅ Configuration in the infrastructure layer
- ✅ Per-endpoint overrides via decorators on controllers
- ❌ Never in the domain layer
- ❌ Never in use cases or application services
- ❌ Never conditionally applied based on business rules (use quotas for that)

---

## 9. Multi-Instance & Distributed Considerations

### 9.1 The Shared State Problem

In a horizontally scaled deployment, each application instance must share rate limit counters. Without shared state, a client hitting 4 replicas gets 4x the intended limit.

```text
❌ In-memory counters (per instance):
  Instance A: 50/100    Instance B: 50/100    → Client sent 100 total, no limit triggered

✅ Redis-backed counters (shared):
  Redis: 100/100  → 429 returned correctly
```

### 9.2 Atomic Operations

Redis provides atomic `INCR` and `EXPIRE` commands that make counter management safe under concurrent access. No application-level locking is needed.

```text
MULTI
  INCR  rate:user:123:window:2024-01-01T12:00
  EXPIRE rate:user:123:window:2024-01-01T12:00 60
EXEC
```

---

## 10. Anti-Patterns

| Anti-Pattern                          | Why It's Wrong                                                                      | Correct Approach                                |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| **In-memory counters in production**  | Not shared across instances; each replica has independent limits                    | Use Redis or equivalent shared store            |
| **Rate limiting health checks**       | Breaks monitoring and orchestrator probes (K8s liveness/readiness)                  | Always exempt infrastructure endpoints          |
| **No `Retry-After` header**           | Clients can't self-regulate; they retry blindly, worsening the load                 | Always include `Retry-After` on 429 responses   |
| **Rate limiting in the domain layer** | Violates separation of concerns; business logic should not know about HTTP concerns | Enforce at the infrastructure/middleware layer  |
| **Same limits for all endpoints**     | Login and product listing have vastly different risk profiles                       | Use tiered limits (§4)                          |
| **Silently dropping requests**        | Clients don't know they're being limited; leads to data loss and confusion          | Always return 429 with clear headers            |
| **Not logging rate limit events**     | No visibility into abuse patterns or misconfigured limits                           | Log every 429 with client identity and endpoint |
| **Hardcoding limits**                 | Cannot adjust without redeployment                                                  | Use environment variables or config service     |

---

## 11. Monitoring & Observability

Rate limiting generates valuable signals. Track these metrics:

| Metric                                | What It Tells You                                                     |
| ------------------------------------- | --------------------------------------------------------------------- |
| `http_requests_throttled_total`       | Total 429 responses — trending up means abuse or misconfigured limits |
| `http_requests_throttled_by_endpoint` | Which endpoints are most targeted                                     |
| `http_requests_throttled_by_client`   | Which clients are hitting limits (potential abuse)                    |
| `throttle_storage_latency_ms`         | Redis/storage health — high latency means rate limiting adds overhead |

Set alerts on:

- **Sudden spike in 429s** → possible attack or misconfigured client
- **Throttle storage latency > 10ms** → Redis connectivity issue
- **Zero 429s for extended periods** → limits may be too permissive (verify they're working)

---

## References

- Beyer, Betsy, Chris Jones, Jennifer Petoff, and Niall Richard Murphy. _Site Reliability Engineering: How Google Runs Production Systems_. O'Reilly, 2016. ISBN 978-1491929124.
- Burns, Brendan. _Designing Distributed Systems: Patterns and Paradigms for Scalable, Reliable Services_. O'Reilly, 2018. ISBN 978-1491983645.
- Richardson, Chris. _Microservices Patterns: With Examples in Java_. Manning, 2018. ISBN 978-1617294549.
- Kleppmann, Martin. _Designing Data-Intensive Applications_. O'Reilly, 2017. ISBN 978-1449373320.
- NestJS Documentation — [Rate Limiting](https://docs.nestjs.com/security/rate-limiting)
- IETF RFC 6585 §4 — [429 Too Many Requests](https://datatracker.ietf.org/doc/html/rfc6585#section-4). Nottingham, M. & Fielding, R., April 2012.
- IETF Draft — [RateLimit Header Fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/). Polli, R. & Martinez, A.
- Stripe API Documentation — [Rate Limiting](https://docs.stripe.com/rate-limits). (Industry reference for tiered rate limiting in production SaaS.)
- Cloudflare Blog — [How We Built Rate Limiting](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/). (Real-world sliding window counter implementation.)
