# Observability — Metrics

This document is the **canonical observability reference** for understanding application metrics, monitoring, and instrumentation. It defines the standard metric types, their mathematical properties, and the recommended practices for building observable systems. All contributors should read this document before adding or modifying instrumentation code.

> **Companion docs**: [`OBSERVABILITY-FOUNDATION.md`](../OBSERVABILITY-FOUNDATION.md), [`ARCHITECTURE.md`](../../architecture/ARCHITECTURE.md), [`SECRETS-MANAGEMENT.md`](../../security/SECRETS-MANAGEMENT.md)

---

## 1. Why Metrics Matter

Metrics provide the **quantitative backbone** of observability. Unlike logs (which are verbose and expensive to store at scale) and traces (which are sampled), metrics are:

- **Low cardinality** — A single counter or gauge occupies constant memory regardless of traffic volume.
- **Aggregatable** — Metrics can be summed, averaged, and percentiled across time windows and dimensions.
- **Alertable** — Threshold-based and anomaly-based alerting systems operate on metric time series natively.

> _"Without metrics, you are flying blind. You may know that your system is broken (from user complaints), but you cannot know where, when, or why it broke."_
> — Baron Schwartz, "Monitoring and Observability", LightStep Blog, 2017

---

## 2. Prometheus Metric Types

> _Source: Prometheus Authors, "Prometheus: Up & Running", O'Reilly, 2018; Prometheus official documentation, https://prometheus.io/docs/concepts/metric_types/_

Prometheus defines four core metric types. Each serves a distinct purpose and has specific mathematical semantics. Understanding these types is essential for correct instrumentation — using the wrong type leads to meaningless dashboards and broken alerts.

### 2.1 Counter

A **Counter** is a monotonically increasing numeric value that can only go up (or reset to zero on process restart). It represents a **cumulative total** of events.

**Mathematical properties:**

- The raw value of a counter is rarely useful on its own. The useful derived signal is the **rate of change** over time: `rate(counter[interval])`.
- Counters are immune to scrape-interval aliasing because `rate()` computes per-second averages across samples.

**When to use:**

- Total number of HTTP requests served (`http_requests_total`)
- Total number of errors encountered (`errors_total`)
- Total bytes transferred (`bytes_sent_total`)

**When NOT to use:**

- Values that can decrease (e.g., active connections, queue depth) — use a Gauge instead.
- Values where you need the current absolute number — use a Gauge instead.

```
Example: http_requests_total{method="GET", route="/resources", status_code="200"} = 15420
         → rate(http_requests_total[5m]) = 12.3 requests/second
```

### 2.2 Gauge

A **Gauge** is a numeric value that can go up or down. It represents a **point-in-time snapshot** of a system property.

**Mathematical properties:**

- Unlike counters, gauges are instantaneously meaningful. The value at scrape time _is_ the metric.
- Common aggregations: `min()`, `max()`, `avg()` over time windows.

**When to use:**

- Current number of active database connections (`db_pool_active_connections`)
- Current queue depth (`bullmq_queue_depth`)
- Temperature, memory usage, or any value that fluctuates
- Binary health status (`redis_health_status`: 1 = up, 0 = down)

**When NOT to use:**

- Cumulative counts of events — use a Counter instead. If you use a gauge for "total requests", you lose data on process restart and cannot compute accurate rates.

```
Example: db_pool_active_connections = 7
         redis_health_status = 1
```

### 2.3 Histogram

A **Histogram** samples observations (typically request durations or response sizes) and counts them in configurable **buckets**. It also provides a sum and count of all observations.

**Mathematical properties:**

- A histogram with buckets `[0.01, 0.05, 0.1, 0.5, 1, 2, 5]` maintains 7 cumulative counters, one for each bucket boundary.
- The `le` (less-than-or-equal) label on each bucket counter enables **quantile approximation** at query time: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`.
- The `_sum` and `_count` suffixes enable computing the **mean**: `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`.

**When to use:**

- Request latency distributions (`http_request_duration_seconds`)
- Response payload sizes
- Any observation where percentiles (p50, p95, p99) are more meaningful than averages

**When NOT to use:**

- Simple counts of events — use a Counter.
- Current-state values — use a Gauge.

**Bucket selection guidance:**

Buckets should be chosen to reflect the expected distribution of the measured quantity. For HTTP request durations:

| Application Type         | Recommended Buckets (seconds)                   |
| :----------------------- | :---------------------------------------------- |
| Low-latency API          | `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]` |
| Standard web application | `[0.01, 0.05, 0.1, 0.5, 1, 2, 5]`               |
| Batch / long-running     | `[0.1, 0.5, 1, 5, 10, 30, 60]`                  |

> **Warning (Prometheus docs):** Too few buckets lose resolution. Too many buckets increase cardinality and storage costs. A good rule of thumb is 5–10 buckets per histogram.

```
Example: http_request_duration_seconds_bucket{le="0.1"} = 9800   (98% under 100ms)
         http_request_duration_seconds_bucket{le="0.5"} = 9950   (99.5% under 500ms)
         http_request_duration_seconds_bucket{le="+Inf"} = 10000
         http_request_duration_seconds_sum = 342.5
         http_request_duration_seconds_count = 10000
         → mean = 342.5 / 10000 = 34.25ms
         → p95 ≈ histogram_quantile(0.95, ...) ≈ 87ms
```

### 2.4 Summary

A **Summary** is similar to a histogram but calculates quantiles **client-side** (in the application process) rather than at query time. It is less commonly used because:

- Client-side quantiles cannot be aggregated across instances.
- Bucket-based histograms are more flexible for ad-hoc queries.

**When to use:** Only when you need precise quantiles from a single instance and cannot tolerate histogram bucket approximation error. In most cases, prefer histograms.

### 2.5 Registry & collectDefaultMetrics

**Registry** is the container object that holds all metric instances. Each metric must be registered in a registry to be exposed at the scrape endpoint. Using a dedicated registry (rather than the global default) provides isolation — ensuring that only intentionally registered metrics are exposed.

**`collectDefaultMetrics`** automatically registers a set of process-level metrics defined by the Prometheus client library, including:

| Metric                             | Type      | Description                            |
| :--------------------------------- | :-------- | :------------------------------------- |
| `process_cpu_user_seconds_total`   | Counter   | Total CPU time spent in user mode      |
| `process_cpu_system_seconds_total` | Counter   | Total CPU time spent in system mode    |
| `process_resident_memory_bytes`    | Gauge     | Resident memory size in bytes          |
| `process_heap_bytes`               | Gauge     | Process heap size in bytes             |
| `nodejs_eventloop_lag_seconds`     | Gauge     | Event loop lag in seconds              |
| `nodejs_active_handles_total`      | Gauge     | Number of active handles               |
| `nodejs_active_requests_total`     | Gauge     | Number of active requests              |
| `nodejs_gc_duration_seconds`       | Histogram | Garbage collection duration by GC type |

> **Practical note:** These default metrics provide essential signals for diagnosing memory leaks (`process_resident_memory_bytes` trending upward), CPU saturation (`process_cpu_*` rates approaching core count), and event loop blocking (`nodejs_eventloop_lag_seconds` exceeding 100ms).

---

## 3. Metric Naming Conventions

> _Source: Prometheus naming best practices, https://prometheus.io/docs/practices/naming/_

Well-named metrics are self-documenting. Poorly named metrics create confusion and make dashboards unmaintainable.

### 3.1 Rules

| Rule                                    | Example ✅                          | Anti-Pattern ❌           |
| :-------------------------------------- | :---------------------------------- | :------------------------ |
| Use `snake_case`                        | `http_requests_total`               | `httpRequestsTotal`       |
| Include unit as suffix                  | `http_request_duration_seconds`     | `http_request_duration`   |
| Use `_total` suffix for counters        | `auth_login_failures_total`         | `auth_login_failures`     |
| Use base units (seconds, bytes)         | `response_size_bytes`               | `response_size_kilobytes` |
| Prefix with subsystem/domain            | `db_pool_active_connections`        | `active_connections`      |
| Avoid encoding label values in the name | `http_requests_total{method="GET"}` | `http_get_requests_total` |

### 3.2 Label Cardinality

Labels add dimensions to metrics, but each unique label combination creates a separate time series. **High-cardinality labels** (e.g., user IDs, request IDs, email addresses) are the most common cause of metrics storage explosion and must be avoided.

| Label Cardinality | Example                                 | Impact                               |
| :---------------- | :-------------------------------------- | :----------------------------------- |
| Low (safe)        | `method=["GET","POST","PUT","DELETE"]`  | 4 time series per metric             |
| Medium (careful)  | `route=["/resources","/operations",...]` | ~20–50 time series per metric        |
| High (dangerous)  | `userId=["1","2",...,"100000"]`         | 100,000 time series — storage crisis |
| Unbounded (fatal) | `requestId=["uuid-1","uuid-2",...]`     | Infinite growth — OOM crash          |

> _"Every label you add multiplies the number of time series. If you have 10 routes × 4 methods × 5 status codes, that is 200 time series for a single metric. Add a user_id label and you have 200 × N_users — a ticking time bomb."_
> — Robust Perception, "Label Cardinality", 2019

---

## 4. The Four Golden Signals

> _Source: Google SRE Book, Chapter 6 — "Monitoring Distributed Systems", 2016_

Google's Site Reliability Engineering handbook defines four signals that should be monitored for every user-facing service:

| Signal         | Definition                                                                                      | Metric Example                                      |
| :------------- | :---------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| **Latency**    | The time it takes to service a request. Distinguish between successful and failed requests.     | `http_request_duration_seconds` (histogram)         |
| **Traffic**    | The demand placed on the system, measured in requests per second or transactions per second.    | `rate(http_requests_total[5m])`                     |
| **Errors**     | The rate of requests that fail, either explicitly (5xx) or implicitly (wrong content, timeout). | `rate(http_requests_total{status_code=~"5.."}[5m])` |
| **Saturation** | How "full" a resource is — CPU, memory, disk, connection pool, queue depth.                     | `db_pool_active_connections`, `bullmq_queue_depth`  |

> **Practical note:** If you can only instrument four metrics, instrument these four. They cover the vast majority of production incidents.

---

## 5. The RED Method

> _Source: Tom Wilkie, "The RED Method: How to Instrument Your Services", Grafana Labs, 2018_

The RED method is a simplification of the Golden Signals, focused specifically on request-driven services:

| Signal       | Definition                        | Metric                                                                     |
| :----------- | :-------------------------------- | :------------------------------------------------------------------------- |
| **R**ate     | Requests per second               | `rate(http_requests_total[5m])`                                            |
| **E**rrors   | Failed requests per second        | `rate(http_requests_total{status_code=~"5.."}[5m])`                        |
| **D**uration | Distribution of request latencies | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |

The RED method is the recommended starting point for any HTTP API — it maps directly to user experience and is sufficient for the majority of alerting rules.

---

## 6. The USE Method

> _Source: Brendan Gregg, "The USE Method", 2012, http://www.brendangregg.com/usemethod.html_

The USE method complements RED by focusing on **infrastructure resources** rather than requests:

| Signal          | Definition                                                       | Metric Example                   |
| :-------------- | :--------------------------------------------------------------- | :------------------------------- |
| **U**tilisation | The proportion of time a resource is busy or the % capacity used | `process_cpu_user_seconds_total` |
| **S**aturation  | The degree to which work is queued because the resource is full  | `bullmq_queue_depth`             |
| **E**rrors      | The count of error events on the resource                        | `db_connection_errors_total`     |

> **Practical guidance:** Apply RED to your services (HTTP handlers, use cases) and USE to your resources (database pools, Redis, queues, CPU). Together, they provide comprehensive coverage.

---

## 7. Metric Security

### 7.1 Endpoint Protection

The `/metrics` endpoint exposes internal system state — connection pool sizes, error rates, queue depths, memory usage. This information is valuable to attackers for:

- **Reconnaissance** — Understanding infrastructure topology and identifying bottlenecks to exploit.
- **Timing attacks** — Correlating metric values with attack attempts to infer success/failure.
- **Denial-of-service planning** — Identifying resource limits (pool sizes, queue capacities) to target.

The metrics endpoint must therefore be protected. Common strategies:

| Strategy                    | Mechanism                                                               | Trade-off                                     |
| :-------------------------- | :---------------------------------------------------------------------- | :-------------------------------------------- |
| **API key in header**       | `X-Metrics-Api-Key` header validated with constant-time comparison      | Simple; requires key rotation discipline      |
| **Network-level isolation** | Bind metrics to a separate port accessible only from the monitoring VPC | Strong; requires infrastructure configuration |
| **mTLS**                    | Mutual TLS authentication between Prometheus and the application        | Strongest; highest operational complexity     |

### 7.2 Authentication Best Practices

When using API key authentication for the metrics endpoint:

1. **Header-only** — Never accept the API key via query parameters. Query strings are logged in access logs, proxies, CDN edge logs, and browser history. This constitutes secret leakage (OWASP A02:2021 — Cryptographic Failures).

2. **Constant-time comparison** — Use `crypto.timingSafeEqual()` (Node.js) or equivalent to compare the provided key against the expected key. Standard string comparison (`===`) is vulnerable to timing-based side-channel attacks (CWE-208), where an attacker can infer characters of the secret by measuring response time differences.

3. **Environment variable isolation** — Store the API key in an environment variable or secrets manager, never in source code.

---

## 8. Anti-Patterns to Avoid

### 8.1 "Metric per User" / "Metric per Entity"

Creating a separate time series for each user, tenant, resource, or entity ID. This causes unbounded cardinality growth and eventually crashes the metrics server.

### 8.2 "Gauge for Cumulative Events"

Using a Gauge to count total events (e.g., total logins). On process restart, the gauge resets to zero and the "total" is lost. Use a Counter — Prometheus's `rate()` function handles restarts correctly.

### 8.3 "Average-Only Latency"

Recording only the mean request duration. Averages hide outliers — a mean of 50ms is meaningless if 1% of requests take 10 seconds. Use a Histogram and query p95/p99 percentiles.

### 8.4 "Instrumenting Everything"

Adding metrics to every function and code path. Each metric consumes memory and increases scrape payload size. Instrument the **boundaries** (HTTP handlers, database calls, queue operations) and the **business events** (login, creation, deletion). Internal function-level timing belongs in traces, not metrics.

### 8.5 "Ignoring Default Metrics"

Skipping `collectDefaultMetrics()` and writing custom process metrics. The default metrics are battle-tested, correctly implemented, and cover the most critical process-level signals. Always enable them.

---

## 9. References & Academic Reading

1. Sridharan, C. (2018). _Distributed Systems Observability_. O'Reilly Media. (Defines the Three Pillars of Observability — metrics, logs, traces — and their complementary roles in understanding distributed system behaviour.)
2. Beyer, B., Jones, C., Petoff, J., & Murphy, N.R. (2016). _Site Reliability Engineering: How Google Runs Production Systems_. O'Reilly Media. Chapter 6: "Monitoring Distributed Systems". (Introduces the Four Golden Signals — latency, traffic, errors, saturation — as the foundation of service monitoring.)
3. Prometheus Authors. (2018). _Prometheus: Up & Running_. O'Reilly Media. (Comprehensive guide to the Prometheus data model, metric types, PromQL, and alerting best practices.)
4. Prometheus Documentation. "Metric Types". https://prometheus.io/docs/concepts/metric_types/ (Canonical reference for Counter, Gauge, Histogram, and Summary semantics.)
5. Prometheus Documentation. "Metric and Label Naming". https://prometheus.io/docs/practices/naming/ (Official naming conventions for metrics and labels.)
6. Wilkie, T. (2018). "The RED Method: How to Instrument Your Services". Grafana Labs. https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ (Simplifies the Golden Signals into Rate, Errors, Duration for request-driven services.)
7. Gregg, B. (2012). "The USE Method". http://www.brendangregg.com/usemethod.html (Defines Utilisation, Saturation, Errors as the framework for resource-focused monitoring.)
8. OWASP Foundation. (2021). "A02:2021 — Cryptographic Failures". https://owasp.org/Top10/A02_2021-Cryptographic_Failures/ (Documents risks of secret exposure via query parameters, logs, and insufficient transport-layer protection.)
9. MITRE CWE. "CWE-208: Observable Timing Discrepancy". https://cwe.mitre.org/data/definitions/208.html (Describes timing side-channel vulnerabilities in string comparison operations.)
10. Schwartz, B., Zaitsev, P., & Tkachenko, V. (2012). _High Performance MySQL_. 3rd ed. O'Reilly Media. Chapter 3: "Profiling Server Performance". (Demonstrates the importance of percentile-based latency analysis over mean-based metrics.)
11. Burns, B. (2018). _Designing Distributed Systems_. O'Reilly Media. (Covers sidecar and ambassador patterns for metrics collection in containerised environments.)
