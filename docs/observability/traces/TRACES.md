# Observability - Traces and Correlation

This document defines tracing and correlation as observability practices. It is intentionally domain-neutral and should apply to future features regardless of whether execution is synchronous, asynchronous, monolithic, distributed, event-driven, or batch-oriented.

A trace is a representation of one logical execution path through a system. A span is a timed operation within that path. Correlation identifiers group related telemetry records; traces add causal structure, parent-child relationships, and latency information.

> Companion docs: [Observability Foundation](../OBSERVABILITY-FOUNDATION.md), [Metrics](../metrics/METRICS.md), [Logs](../logs/LOGS.md)

---

## 1. Correlation Versus Tracing

Correlation and tracing are often discussed together, but they solve different problems.

| Concept | Description | Primary Use |
| :-- | :-- | :-- |
| Correlation ID | A shared identifier attached to related telemetry records | Find logs, events, or messages belonging to the same logical operation |
| Trace ID | The identifier for a distributed trace | Group all spans in one execution path |
| Span ID | The identifier for a single operation inside a trace | Describe local timing, attributes, and parent-child relationships |
| Parent Span ID | The link from a child operation to the operation that caused it | Reconstruct causal structure |

Correlation IDs are simple and useful even without a tracing backend. Distributed traces are richer: they describe where execution went, how long each operation took, and which operation caused the next one.

---

## 2. Trace Model

The standard trace model contains:

- A trace, representing the complete logical operation.
- Spans, representing timed units of work.
- Parent-child relationships, representing causality.
- Attributes, representing structured metadata about an operation.
- Events, representing timestamped annotations inside a span.
- Status, representing whether the operation succeeded or failed.
- Links, representing relationships that are not strict parent-child relationships.

Example:

```text
trace request-123
  span http.request                 120 ms
    span auth.check                  8 ms
    span database.query             35 ms
    span external.call              60 ms
      span retry.delay              20 ms
```

This structure makes latency visible. If the overall request took 120 ms, the trace can show whether time was spent in local computation, database access, network calls, queue delay, retries, or downstream services.

---

## 3. Span Boundaries

Span boundaries should represent meaningful units of work. A trace with too few spans hides causality; a trace with too many spans becomes expensive and difficult to read.

Good span boundaries include:

- Incoming request handling.
- Command, query, job, or message handling.
- Database and cache operations.
- External network calls.
- Queue publication and consumption.
- File or object-storage operations.
- Expensive computations.
- Retry attempts, fallback paths, and timeout boundaries.

Avoid creating spans for trivial helper functions unless they are expensive, failure-prone, or operationally meaningful.

---

## 4. Context Propagation

Tracing depends on context propagation. When execution crosses a boundary, the trace context must cross with it.

Common propagation boundaries include:

- HTTP headers.
- RPC metadata.
- Message queue headers or payload metadata.
- Scheduled task metadata.
- Asynchronous local storage inside a process.
- Worker thread or child process messages.

The W3C Trace Context standard defines `traceparent` and `tracestate` headers so services and tools can interoperate. When OpenTelemetry is used, propagation is usually handled by instrumentation libraries, but asynchronous and custom boundaries still require careful review.

A missing propagation step breaks the trace into disconnected fragments. This does not merely reduce aesthetics; it weakens the ability to reason about causality during incidents.

---

## 5. Sampling

Tracing every operation can be too expensive at high throughput. Sampling controls how many traces are retained.

Common strategies:

| Strategy | Description | Trade-off |
| :-- | :-- | :-- |
| Head sampling | Decide at the beginning of the trace | Cheap, but may drop traces that later fail |
| Tail sampling | Decide after seeing the whole trace | Better evidence for failures, but requires buffering and collector support |
| Probabilistic sampling | Retain a fixed percentage | Simple, but rare events may be missed |
| Rule-based sampling | Retain traces matching criteria | Useful for failures, slow requests, or important routes |

Sampling should preserve exceptional evidence. Slow operations, failed operations, and traces with unusual dependency behavior are usually more valuable than ordinary successful traces.

---

## 6. Trace Attributes and Privacy

Trace attributes should help explain execution without exposing sensitive data.

Prefer:

- Route templates instead of raw URLs.
- Dependency names instead of full connection strings.
- Operation names instead of raw payloads.
- Status classes instead of full response bodies.
- Bounded enumerations instead of unbounded identifiers.

Avoid:

- Passwords, tokens, cookies, private keys, and authorization headers.
- Raw personal data.
- Full request or response bodies.
- Unbounded identifiers when they are not necessary for diagnosis.
- Large attributes that increase storage and indexing cost.

The same privacy discipline used for logs applies to traces. Trace backends are operational databases and should be treated as sensitive systems.

---

## 7. Relationship to Metrics and Logs

Traces are strongest when used with metrics and logs.

Metrics answer: is behavior abnormal?

Traces answer: where did the operation spend time, and which components were involved?

Logs answer: what specific decisions, errors, or state transitions occurred?

A useful incident workflow often starts with a metric alert, pivots to traces for affected operations, and then inspects correlated logs for local explanations. This workflow requires consistent identifiers across all three signals.

---

## 8. Tooling and Backends

OpenTelemetry is the current vendor-neutral standard for generating, propagating, collecting, and exporting traces. A typical tracing stack includes:

- Application instrumentation that creates spans.
- Context propagation across process and network boundaries.
- A collector that receives, processes, samples, and exports telemetry.
- A trace backend, such as Tempo, Jaeger, Zipkin, or a managed platform.
- A visualization layer that connects traces to metrics and logs.

Tempo, Jaeger, and Zipkin are trace backends. Grafana is commonly used as the visualization layer. Prometheus is primarily a metrics backend. Loki is primarily a logs backend.

---

## 9. Review Checklist

Use this checklist when adding or changing tracing:

- Is there a clear operation name?
- Are span boundaries meaningful rather than excessively granular?
- Does context propagate across every asynchronous and network boundary?
- Are error status and exception metadata captured safely?
- Are route names normalized?
- Are sensitive attributes excluded or redacted?
- Does sampling preserve slow and failed operations?
- Can traces be joined to logs by `traceId`, `spanId`, or `correlationId`?
- Can metrics link to trace exemplars where the backend supports them?

---

## 10. References

1. W3C. (2021). Trace Context. W3C Recommendation.
2. OpenTelemetry Authors. OpenTelemetry Specification.
3. Sigelman, B. H., Barroso, L. A., Burrows, M., Stephenson, P., Plakal, M., Beaver, D., Jaspan, S., and Shanbhag, C. (2010). "Dapper, a Large-Scale Distributed Systems Tracing Infrastructure." Google Technical Report.
4. Sridharan, C. (2018). Distributed Systems Observability. O'Reilly Media.
5. Majors, C., Fong-Jones, L., and Miranda, G. (2022). Observability Engineering. O'Reilly Media.
