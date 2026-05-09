# Observability - Foundation

This document defines the conceptual foundation for observability in software systems. It is intentionally domain-neutral: the vocabulary, models, and practices here should apply to future features regardless of product area, architecture style, or deployment topology.

Observability is the extent to which the internal state of a system can be inferred from externally available evidence. In control theory, observability is a formal property of dynamic systems; in software operations, the term is used more pragmatically to describe whether engineers can ask new questions about production behavior without first shipping new instrumentation.

> _This document is designed to be consumed by any engineering team. It is not tied to a specific project or codebase._

---

## 1. Observability and Monitoring

Monitoring and observability are related but not identical.

Monitoring asks whether known failure modes are occurring. It is effective when the organization already knows which symptoms matter: high error rate, high latency, exhausted resources, failed dependency checks, or missed service objectives.

Observability asks whether the system emits enough evidence to investigate unknown or novel failure modes. It is effective when incidents do not match a pre-existing dashboard or alert. A highly observable system supports exploratory diagnosis: engineers can form hypotheses, query evidence, and narrow the search space without redeploying code.

| Concept       | Primary Question                     | Typical Mechanism                       | Failure Mode                                                |
| :------------ | :----------------------------------- | :-------------------------------------- | :---------------------------------------------------------- |
| Monitoring    | Is a known condition happening?      | Dashboards, alerts, health checks       | Silent failure when the condition was not anticipated       |
| Observability | Why is the system behaving this way? | Metrics, logs, traces, events, profiles | Ambiguous evidence, missing context, high-cardinality noise |

A mature operational practice uses both. Monitoring provides detection; observability provides explanation.

---

## 2. The Three Pillars

The three-pillar model is a useful teaching model, not a law of nature. Metrics, logs, and traces are complementary data structures optimized for different questions.

| Pillar  | Definition                                             | Best At                                                                                     | Weakness                                                                     |
| :------ | :----------------------------------------------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------- |
| Metrics | Numeric time series sampled or aggregated over time    | Detecting trends, alerting, capacity analysis, service-level objectives                     | Low explanatory detail; labels must be controlled carefully                  |
| Logs    | Timestamped event records with contextual fields       | Explaining discrete events, preserving local detail, supporting audit and forensic analysis | Expensive at high volume; weak at aggregate trend detection unless processed |
| Traces  | Causally linked spans that describe one execution path | Understanding latency, fan-out, dependency behavior, and cross-boundary causality           | Often sampled; requires propagation discipline                               |

The pillars should not compete. Metrics indicate that an abnormal condition exists. Traces show where time and causality moved. Logs explain what specific decisions or errors occurred at important points in the execution.

---

## 3. Events, Context, and Causality

Observability depends less on collecting large amounts of data and more on preserving useful context.

A telemetry event is useful when it answers at least one of the following questions:

- What happened?
- When did it happen?
- Where in the system did it happen?
- Which execution path or request did it belong to?
- Which actor, component, configuration, or dependency influenced it?
- What was the outcome?

Correlation and causality are distinct. A correlation identifier groups records that belong to the same logical operation. A trace describes causal structure: parent spans, child spans, timing, and boundaries. Correlation is usually sufficient for log grouping; tracing is stronger when the goal is to understand latency and distributed execution.

---

## 4. Instrumentation Boundaries

Instrumentation should be placed where it maximizes diagnostic value while minimizing noise.

High-value boundaries include:

- External entry points, such as HTTP handlers, message consumers, schedulers, and command handlers.
- External exits, such as database calls, cache calls, network clients, file systems, and third-party services.
- Asynchronous boundaries, such as queues, streams, background jobs, and event dispatch.
- State transitions, such as workflow changes, retry decisions, circuit-breaker decisions, and permission decisions.
- Resource boundaries, such as connection pools, thread pools, memory, CPU, disk, and queue depth.

Low-value instrumentation includes excessive function-level logs, metrics with unbounded labels, and traces that duplicate every internal helper call. The goal is not total recording; the goal is sufficient evidence at meaningful boundaries.

---

## 5. Cardinality, Cost, and Signal Quality

Telemetry has operational cost. It consumes CPU, memory, network bandwidth, storage, indexing capacity, and human attention. More telemetry is not automatically better.

Cardinality is the number of distinct values a field can take. High-cardinality fields are often valuable in logs and traces, where they support investigation of a specific execution. The same fields can be dangerous in metrics, where each label combination creates a new time series.

| Field Type         | Metrics                  | Logs                                             | Traces                               |
| :----------------- | :----------------------- | :----------------------------------------------- | :----------------------------------- |
| HTTP method        | Safe label               | Useful field                                     | Useful span attribute                |
| Route template     | Safe label if normalized | Useful field                                     | Useful span attribute                |
| Status class       | Safe label               | Useful field                                     | Useful span attribute                |
| User identifier    | Usually unsafe label     | Sensitive; log only when justified and protected | Sensitive; usually avoid or hash     |
| Request identifier | Unsafe label             | Useful correlation field                         | Trace identifier already covers this |
| Raw URL/query      | Unsafe label             | Risky; may contain secrets                       | Risky; prefer sanitized attributes   |

An academic way to state the principle: telemetry should maximize information gain per unit cost.

---

## 6. Service-Level Thinking

Observability should be tied to reliability objectives. A system can produce beautiful telemetry and still fail users if no one has defined what good service means.

Useful service-level questions include:

- What operation is user-visible or dependency-visible?
- What latency threshold separates acceptable from degraded behavior?
- Which failures should count against reliability objectives?
- Which dependencies are critical, degraded, or optional?
- Which alerts require immediate human response?

Metrics usually encode service-level indicators. Logs and traces provide the explanatory evidence needed when indicators degrade.

---

## 7. Governance and Review

Telemetry should be reviewed with the same seriousness as public APIs and database schemas. Poor instrumentation can leak secrets, create unbounded storage costs, or mislead incident responders.

A telemetry review should check:

- The signal has a clear operational question.
- Names are consistent and domain-neutral where possible.
- Metric labels are bounded and normalized.
- Logs avoid secrets and unnecessary personal data.
- Trace attributes avoid sensitive payloads.
- Sampling decisions preserve enough evidence for rare failures.
- Dashboards distinguish symptoms from causes.
- Alerts are actionable and tied to ownership.

---

## 9. Anti-Patterns

| Anti-Pattern                           | Problem                                                                                                                                                                          | Correct Approach                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Logging everything**                 | Excessive telemetry creates noise, increases storage costs, and makes incidents harder to diagnose because relevant signals are buried.                                          | Instrument at meaningful boundaries. Prefer quality of signal over quantity.                                           |
| **Metrics with unbounded labels**      | Using user IDs, request IDs, or raw URLs as metric labels creates infinite time series, crashing the metrics backend.                                                            | Keep metric labels bounded and normalized. Use logs and traces for high-cardinality data.                              |
| **Ignoring correlation**               | Logs, metrics, and traces from the same operation cannot be joined. Incident investigation requires manual guesswork across tools.                                               | Propagate `correlationId` / `traceId` consistently across all telemetry types.                                         |
| **Alerting on every error log**        | Error logs include expected failures (invalid input, auth denial). Alerting on all of them creates alert fatigue and masks real incidents.                                       | Alert on SLO-derived metrics (error rate, latency percentile). Use logs for investigation, not detection.              |
| **Treating observability as optional** | Instrumentation is deferred until "after launch." Post-launch, incidents arrive without diagnostic evidence and the team is forced into reactive instrumentation under pressure. | Instrument at the same time as the feature. Observability is a first-class requirement, not a follow-up.               |
| **Separate, disconnected tools**       | Metrics, logs, and traces stored in different systems with no cross-linking. Pivoting between signals requires manual context transfer.                                          | Use consistent identifiers across all pillars. Choose tooling that supports cross-signal navigation (e.g., exemplars). |

---

## 10. References

1. Kalman, R. E. (1960). "On the General Theory of Control Systems." Proceedings of the First International Congress on Automatic Control.
2. Sridharan, C. (2018). Distributed Systems Observability. O'Reilly Media.
3. Beyer, B., Jones, C., Petoff, J., and Murphy, N. R. (2016). Site Reliability Engineering. O'Reilly Media.
4. Turnbull, J. (2018). The Art of Monitoring. Turnbull Press.
5. Majors, C., Fong-Jones, L., and Miranda, G. (2022). Observability Engineering. O'Reilly Media.
