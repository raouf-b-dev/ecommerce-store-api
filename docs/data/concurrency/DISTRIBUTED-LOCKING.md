# Distributed Locking

A deep-dive into mutual exclusion across processes and services: why database locks are insufficient for multi-instance coordination, how Redis-based distributed locks work, the Redlock algorithm, the fencing token pattern for safety under process pauses, and lease-based coordination semantics.

> _Part of the [Concurrency Control](CONCURRENCY-FOUNDATIONS.md) series. For single-database locking, see [Pessimistic Locking](PESSIMISTIC-LOCKING.md). For the broader consistency model, see [Consistency Foundations](../consistency/CONSISTENCY-FOUNDATIONS.md)._

---

## 1. Why Database Locks Are Insufficient

PostgreSQL's row-level locks (`SELECT ... FOR UPDATE`) and advisory locks (`pg_advisory_lock`) are effective for coordinating concurrent transactions **within a single database**. However, they fail to address several scenarios common in production API deployments:

| Scenario                                                                                               | Why Database Locks Fail                                                                                                                                                                                                                             |
| :----------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multiple application instances** running the same cron job                                           | Advisory locks work only if all instances connect to the same database and use the same connection pool. In practice, connection poolers (PgBouncer in transaction mode) may release the connection between statements, silently dropping the lock. |
| **Cross-service coordination** (e.g., only one service instance should process a webhook)              | Services may use different databases. No shared lock namespace exists.                                                                                                                                                                              |
| **Rate-limited external API calls** (e.g., only one instance should call a payment provider at a time) | The critical section isn't a database transaction — it's an HTTP call. Holding a database transaction open during an external call is an anti-pattern (connection starvation).                                                                      |
| **Leader election** (one instance should be the "primary" for certain background work)                 | Requires a persistent, distributed coordination primitive — not a per-transaction lock.                                                                                                                                                             |

The solution is a **distributed lock** — a coordination primitive backed by a shared external store (Redis, ZooKeeper, etcd) that is accessible to all processes.

---

## 2. Redis-Based Distributed Locks

> _Source: Salvatore Sanfilippo (antirez). "Distributed Locks with Redis." https://redis.io/docs/latest/develop/use-cases/distributed-lock/_

### 2.1 The Basic Pattern: SETNX + TTL

The simplest distributed lock uses Redis's atomic `SET` command with the `NX` (set-if-not-exists) and `PX` (expiry in milliseconds) flags:

```
SET lock:checkout:order-42 <unique-token> NX PX 30000
```

| Flag             | Meaning                                                                                                                   |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `NX`             | Only set the key if it does **not** already exist. This is the mutual exclusion mechanism.                                |
| `PX 30000`       | Set a 30-second TTL (time-to-live). This is the **lease** — it prevents a dead process from holding the lock forever.     |
| `<unique-token>` | A unique value (e.g., UUID) identifying the lock holder. Required for safe unlock — only the holder can release the lock. |

**Acquiring the lock**:

```typescript
const token = crypto.randomUUID();
const acquired = await redis.set(
  `lock:checkout:${orderId}`,
  token,
  'NX',
  'PX',
  30000,
);

if (acquired === 'OK') {
  // Lock acquired — proceed with critical section
} else {
  // Lock held by another process — retry or abort
}
```

**Releasing the lock** (must be atomic — only the holder may release):

```lua
-- Lua script executed atomically by Redis
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

> **Why the token matters**: Without it, Process A could acquire the lock, pause (GC, network delay), have the lock expire, Process B acquires it, then Process A resumes and deletes Process B's lock. The token ensures only the original holder can release.

### 2.2 Limitations of Single-Instance Redis Locks

A lock backed by a single Redis instance has a fundamental safety gap: **if Redis crashes or restarts, the lock is lost**. A process holding the lock may continue operating under the assumption of mutual exclusion while another process acquires the (now-vacant) lock after Redis recovers.

This is acceptable for **efficiency locks** (preventing duplicate work where occasional duplication is harmless) but not for **correctness locks** (where concurrent execution would violate an invariant).

> _"The purpose of a lock is either efficiency or correctness. For efficiency locks, a Redis single-instance lock is perfectly fine. For correctness locks, you need stronger guarantees."_
> — Kleppmann, M. (2016). "How to do distributed locking." https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html

---

## 3. The Redlock Algorithm

> _Source: Sanfilippo, S. "Distributed Locks with Redis — The Redlock Algorithm." https://redis.io/docs/latest/develop/use-cases/distributed-lock/_

Redlock attempts to provide stronger safety guarantees by using **N independent Redis instances** (typically 5) and acquiring the lock on a majority of them.

### 3.1 Algorithm Steps

```
1. Record the current time T₁.

2. Attempt to acquire the lock on all N Redis instances sequentially,
   using the same key, same unique token, and same TTL.
   Use a short per-instance timeout (e.g., 5-50ms) to avoid blocking
   on unreachable instances.

3. Record the current time T₂.
   Compute elapsed = T₂ - T₁.

4. The lock is considered acquired if and only if:
   a) The lock was acquired on a MAJORITY of instances (≥ N/2 + 1)
   b) The total elapsed time is LESS than the lock's TTL
      (so the remaining validity is TTL - elapsed)

5. If the lock was NOT acquired (minority or timeout), release the lock
   on ALL instances (even those where it was acquired).
```

### 3.2 The Kleppmann-Sanfilippo Debate

Martin Kleppmann (2016) published a rigorous critique of Redlock, arguing that it is fundamentally unsafe for correctness locks because:

1. **Process pauses**: A process acquires the lock, then experiences a long GC pause or network delay. The lock's TTL expires. Another process acquires the lock. The first process resumes and acts on the stale lock — mutual exclusion is violated.

2. **Clock assumptions**: Redlock's correctness depends on bounded clock drift across all nodes. If a Redis node's clock jumps forward (NTP adjustment), a lock may expire prematurely.

Sanfilippo responded that Redlock provides stronger guarantees than single-instance locks and that the process-pause problem applies to all distributed locks, not just Redlock.

**Practical guidance**:

| Lock Purpose                                                             | Recommendation                                                                        |
| :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Efficiency** (prevent duplicate cron execution, reduce redundant work) | Single-instance Redis lock is sufficient. Occasional duplication is tolerable.        |
| **Correctness** (invariant enforcement, financial transactions)          | Use Redlock + fencing tokens (§4), or use a consensus-based system (ZooKeeper, etcd). |

---

## 4. Fencing Tokens

> _Source: Kleppmann, M. (2016). "How to do distributed locking." https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html_

A **fencing token** is a monotonically increasing number issued each time a lock is acquired. The token is attached to every operation performed under the lock. The resource being protected (e.g., a database, a storage service) rejects operations with a token that is **lower than** the highest token it has already seen.

### 4.1 The Problem Without Fencing

```
Time ──────────────────────────────────────────────────────────►

Process A                                Process B
─────────                                ─────────
Acquires lock (token=33) ✅

Enters GC pause...
                                         Lock expires (TTL)
                                         Acquires lock (token=34) ✅
  ... (A is paused, unaware             Writes to storage with token=34 ✅
       that its lock expired) ...
                                         Releases lock

A resumes, believes it still holds lock
Writes to storage (STALE!) ❌
→ Overwrites B's write → DATA CORRUPTION
```

### 4.2 The Solution With Fencing

```
Time ──────────────────────────────────────────────────────────►

Process A                                Process B
─────────                                ─────────
Acquires lock (token=33) ✅

Enters GC pause...
                                         Lock expires (TTL)
                                         Acquires lock (token=34) ✅
                                         Writes to storage with token=34 ✅
                                         Releases lock

A resumes, believes it still holds lock
Writes to storage with token=33
→ Storage rejects: 33 < 34 (highest seen) ✅ SAFE
→ A detects its lock was superseded
```

### 4.3 Implementation Pattern

```typescript
// Lock acquisition returns a fencing token
const { acquired, fencingToken } =
  await distributedLock.acquire('resource-key');

if (acquired) {
  // Pass fencing token to the storage layer
  await storageService.write(data, { fencingToken });
  // Storage validates: if fencingToken < lastSeenToken → reject
}
```

> **Note**: Fencing tokens require the downstream resource to **validate tokens**. This means the storage layer must track the highest token seen per resource and reject stale writes. Not all storage systems support this natively — it may require application-level enforcement.

---

## 5. Lease-Based Coordination

A **lease** is a time-limited grant of exclusive access to a resource. Unlike a permanent lock that must be explicitly released, a lease automatically expires after its TTL — ensuring that crashed or partitioned processes cannot hold resources indefinitely.

### 5.1 Lease Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  ACQUIRE │ ──► │  ACTIVE  │ ──► │  RENEW   │ ──► │ RELEASE  │
│          │     │          │     │ (extend  │     │ (or TTL  │
│ SET NX   │     │ Critical │     │  TTL)    │     │  expiry) │
│ PX ttl   │     │ section  │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                  ┌────┴────┐
                  │ EXPIRED │  ← TTL reached before renewal
                  │ (lost)  │     Process must stop and re-acquire
                  └─────────┘
```

### 5.2 Lease Renewal (Watchdog Pattern)

For long-running operations that may exceed the initial TTL, the lock holder must periodically **renew** the lease before it expires. This is called the **watchdog pattern**:

```typescript
const LEASE_TTL = 30000; // 30 seconds
const RENEWAL_INTERVAL = 10000; // Renew every 10 seconds (TTL/3)

const renewalTimer = setInterval(async () => {
  const extended = await redis.pexpire(`lock:${key}`, LEASE_TTL);
  if (!extended) {
    // Lock was lost (expired or stolen) — stop work immediately
    clearInterval(renewalTimer);
    abortCurrentOperation();
  }
}, RENEWAL_INTERVAL);

try {
  await performLongRunningWork();
} finally {
  clearInterval(renewalTimer);
  await releaseLock(key, token);
}
```

> **Rule of thumb**: Set the renewal interval to **TTL / 3**. This gives two renewal attempts before expiry — enough to survive a single missed renewal due to transient network issues.

---

## 6. Comparison of Distributed Lock Backends

| Backend                       | Consensus        | Availability                       | Complexity | Best For                                              |
| :---------------------------- | :--------------- | :--------------------------------- | :--------- | :---------------------------------------------------- |
| **Redis (single)**            | None             | High (single point of failure)     | Low        | Efficiency locks, deduplication, rate limiting        |
| **Redis (Redlock)**           | Quorum (N/2+1)   | High (tolerates minority failures) | Medium     | Stronger efficiency locks, moderate correctness needs |
| **ZooKeeper**                 | ZAB (Paxos-like) | High (3-5 node ensemble)           | High       | Correctness locks, leader election, service discovery |
| **etcd**                      | Raft             | High (3-5 node cluster)            | Medium     | Kubernetes-native coordination, leader election       |
| **PostgreSQL advisory locks** | Single-node ACID | Database availability              | Low        | Same-database coordination only                       |

---

## 7. Applied Patterns in API Development

| Pattern                       | Lock Type                           | Example                                                                                   |
| :---------------------------- | :---------------------------------- | :---------------------------------------------------------------------------------------- |
| **Cron job deduplication**    | Redis SETNX with TTL                | Ensure only one instance runs `ProcessOutboxQueueJob` at a time across N replicas.        |
| **Idempotency enforcement**   | Redis SETNX (idempotency key)       | Prevent duplicate checkout submissions. See [Idempotency](../consistency/IDEMPOTENCY.md). |
| **Webhook processing**        | Redis SETNX per event ID            | Ensure a Stripe webhook is processed exactly once even if delivered multiple times.       |
| **Rate limiting**             | Redis sliding window / token bucket | Not a lock per se, but uses the same atomic Redis primitives.                             |
| **Leader election**           | etcd/ZooKeeper lease                | One instance is "leader" for background work; others are standby.                         |
| **Cache stampede prevention** | Redis SETNX (cache rebuild lock)    | When a cache key expires, only one instance rebuilds it; others wait or serve stale.      |

---

## 8. References

- Sanfilippo, S. "Distributed Locks with Redis." https://redis.io/docs/latest/develop/use-cases/distributed-lock/
- Kleppmann, M. (2016). "How to do distributed locking." https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. §8.4: "Fencing tokens."
- Hunt, P., Konar, M., Junqueira, F.P., & Reed, B. (2010). "ZooKeeper: Wait-free Coordination for Internet-scale Systems." _Proceedings of USENIX ATC_.
- Ongaro, D. & Ousterhout, J. (2014). "In Search of an Understandable Consensus Algorithm." _Proceedings of USENIX ATC_. (The Raft consensus paper — etcd's foundation.)
- Lamport, L. (1998). "The Part-Time Parliament." _ACM Transactions on Computer Systems_, 16(2), pp. 133–169. (The Paxos consensus paper.)
