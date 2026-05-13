# Observability - Logs

This document defines logging as an observability signal. It is intentionally domain-neutral and should be used as a reference for future features regardless of business domain, transport protocol, or persistence model.

Logs are timestamped records of discrete events. Their primary value is explanatory: they preserve local context about decisions, failures, state transitions, and interactions that cannot be represented efficiently as numeric time series.

> _This document is designed to be consumed by any engineering team. It is not tied to a specific project or codebase._

---

## 1. Purpose of Logging

Logs answer questions about individual events:

- What happened?
- When did it happen?
- Which component observed it?
- Which execution context did it belong to?
- What decision was made?
- What input category, state, or dependency contributed to the outcome?
- What should an operator or developer inspect next?

Logs are not a substitute for metrics. A log stream can be counted after ingestion, but metrics are usually cheaper and more reliable for alerting. Logs are also not a substitute for traces. Logs can be correlated, but traces encode causal structure and timing across execution boundaries.

A useful logging strategy treats logs as selective evidence, not a transcript of every instruction executed by the program.

---

## 2. Event Semantics

A log entry should describe an event, not merely a sentence. The distinction matters because structured events can be queried, aggregated, redacted, routed, and retained according to policy.

A well-formed log event normally contains:

| Field                | Purpose                                                         |
| :------------------- | :-------------------------------------------------------------- |
| `timestamp`          | Establishes ordering and supports time-window queries           |
| `level`              | Communicates severity and operational urgency                   |
| `message`            | Gives a concise human-readable summary                          |
| `context`            | Identifies the component or boundary that emitted the event     |
| `correlationId`      | Groups related records from the same logical operation          |
| `traceId` / `spanId` | Connects logs to distributed traces when tracing is enabled     |
| `event`              | Provides a stable machine-readable event name                   |
| `outcome`            | Distinguishes success, failure, retry, skip, reject, or timeout |
| `error`              | Preserves safe exception metadata when a failure occurs         |

The `message` should be readable, but the structured fields should carry the semantics. Operational tooling should not have to parse prose to understand severity, outcome, route, dependency, or error class.

---

## 3. Structured Logging

Structured logging means emitting logs as structured objects, commonly JSON. The format is designed for machines first and humans second.

Structured logs provide:

- Queryability by field rather than by fragile substring search.
- Consistent correlation across requests, jobs, events, and dependency calls.
- Safer redaction because sensitive fields can be filtered by key.
- Better routing because collectors can index, sample, and retain logs by metadata.
- Better incident reconstruction because events can be sorted and grouped reliably.

Example:

```json
{
  "timestamp": "2026-05-04T17:00:00.000Z",
  "level": "info",
  "event": "request.completed",
  "message": "Request completed",
  "context": "HttpServer",
  "correlationId": "01HX7XK7C3AV3T36G2R8QX8MKT",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "method": "GET",
  "route": "/resources/:id",
  "statusCode": 200,
  "durationMs": 42,
  "outcome": "success"
}
```

Avoid raw payload dumps. Payloads are usually noisy, expensive, and risky. Prefer small, normalized attributes that support diagnosis without exposing sensitive data.

---

## 4. Log Levels

Log levels should communicate operational meaning. If levels are used inconsistently, alerting and filtering become unreliable.

| Level             | Meaning                                                           | Typical Use                                                         |
| :---------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------ |
| `error`           | A failure occurred and the operation did not complete as intended | Unhandled exception, exhausted retry budget, failed dependency call |
| `warn`            | An abnormal condition occurred but the system continued           | Retry scheduled, degraded fallback used, invalid input rejected     |
| `info`            | A significant lifecycle or boundary event occurred                | Process started, request completed, background task finished        |
| `http`            | A transport-level access event occurred                           | Request/response access logging where a custom level is supported   |
| `debug`           | Diagnostic detail for development or temporary investigation      | Internal decision details, sanitized intermediate state             |
| `trace` / `silly` | Very high-volume detail                                           | Rarely enabled outside local or short diagnostic windows            |

A common rule is: if no one should ever act on it and it is emitted frequently, it probably should not be an `info` log.

---

## 5. What to Log

Prefer logging at architectural boundaries and decision points:

- Application startup and shutdown.
- Incoming requests and outgoing responses.
- Message consumption and publication.
- Scheduled task start, completion, skip, and failure.
- External dependency calls, especially failures and timeouts.
- Security-relevant decisions, such as authentication failure or authorization denial.
- Retry, backoff, circuit-breaker, fallback, and cancellation decisions.
- Data validation failures when they are useful for operations or abuse detection.
- State transitions that are operationally significant.

Avoid logging inside tight loops, pure functions, or every repository/helper method unless there is a clear diagnostic question that cannot be answered otherwise.

---

## 6. What Not to Log

Logs often become widely replicated: local files, container stdout, log collectors, object storage, search indexes, backups, dashboards, alert payloads, and incident notes. Treat logs as semi-public within the organization.

Never log:

- Passwords, password hashes, private keys, API keys, session tokens, refresh tokens, or one-time codes.
- Authorization headers, cookies, signed URLs, or full connection strings.
- Raw personal data unless there is a documented legal, security, and operational justification.
- Full request or response bodies by default.
- Raw query strings when they may contain secrets or personal data.
- High-volume debug output in production.

When an identifier is needed for diagnosis, prefer stable internal IDs, hashes, or tokenized references over raw sensitive values. Redaction should happen before the event leaves the application process whenever possible.

---

## 7. Correlation With Metrics and Traces

Logs become substantially more valuable when they can be joined with other telemetry.

Minimum correlation fields:

- `correlationId` for grouping records from the same logical operation.
- `traceId` and `spanId` when distributed tracing is enabled.
- `context` or `component` for locating the emitter.
- `event` for stable machine queries.
- `outcome` for coarse aggregation.

Correlation identifiers should not be used as metric labels because they are unbounded. They belong in logs and traces, not in metric time-series dimensions.

---

## 8. Log Aggregation and Retention

A logging pipeline usually has four stages:

1. Emission from application code or runtime infrastructure.
2. Collection from stdout, files, sidecars, agents, or platform APIs.
3. Processing for parsing, redaction, enrichment, sampling, and routing.
4. Storage and query through a log backend.

Retention should be intentional. High-volume debug logs might be retained for hours or days. Security and audit logs might need longer retention, stronger access controls, and immutability. Operational logs usually sit between those extremes.

Log aggregation tools, such as Loki, Elasticsearch/OpenSearch, or managed log platforms, are part of the logging pillar. Visualization tools, such as Grafana, often query logs alongside metrics and traces, but the underlying signal remains logs.

---

## 9. Review Checklist

Use this checklist when adding or changing logs:

- Does the log answer a concrete diagnostic or audit question?
- Is the event name stable and machine-readable?
- Is the level appropriate for operational urgency?
- Are correlation fields included?
- Are error type, message, and safe stack information preserved for failures?
- Are secrets and personal data excluded or redacted?
- Are high-cardinality fields kept out of metrics labels?
- Is the log volume acceptable under peak traffic and failure conditions?
- Can the log be connected to related metrics or traces?

---

## 10. References

1. Sridharan, C. (2018). Distributed Systems Observability. O'Reilly Media.
2. Turnbull, J. (2018). The Art of Monitoring. Turnbull Press.
3. Majors, C., Fong-Jones, L., and Miranda, G. (2022). Observability Engineering. O'Reilly Media.
4. Fowler, M. (2005). "Event Sourcing." martinfowler.com.
5. OpenTelemetry Authors. "Logs Data Model." OpenTelemetry Specification.
