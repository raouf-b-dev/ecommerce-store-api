# Documentation Index

Canonical technical reference documents, organised by category.

---

## Architecture

- [ARCHITECTURE.md](architecture/ARCHITECTURE.md) — System context, bounded contexts, and domain flows.
- [DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md) — Domain-Driven Design and Hexagonal Architecture principles.
- [CQRS.md](architecture/CQRS.md) — Command/Query Responsibility Segregation evolution path.
- [API-VERSIONING.md](architecture/API-VERSIONING.md) — URI versioning strategy, Anti-Corruption Layer DTO mapping, and deprecation protocol.
- [RATE-LIMITING.md](architecture/RATE-LIMITING.md) — Rate limiting algorithms, tiered enforcement, storage backends, and HTTP conventions.

## Infrastructure

- [PROCESS-LIFECYCLE.md](infrastructure/PROCESS-LIFECYCLE.md) — Process Lifecycle Guide — PIDs, Signals & Graceful Shutdown.
- [TROUBLESHOOTING.md](infrastructure/TROUBLESHOOTING.md) — Common issues and solutions for the API.

### CI/CD & Deployment

- [CICD-FOUNDATIONS.md](infrastructure/cicd/CICD-FOUNDATIONS.md) — Portable CI/CD definitions, GitHub Actions runners, secrets, and deployment topologies. _(hub)_
- [PROJECT-PIPELINE.md](infrastructure/cicd/PROJECT-PIPELINE.md) — Applied NestJS API workflow, parallel checks, dynamic Postgres/Redis container boots, and local verification hooks.
- [PIPELINE-OPTIMIZATION.md](infrastructure/cicd/pipeline/PIPELINE-OPTIMIZATION.md) — Dependency caching, test parallelization state isolation, code quality gates, and SAST/SCA security audits.
- [DEPLOYMENT-STRATEGIES.md](infrastructure/cicd/deployment/DEPLOYMENT-STRATEGIES.md) — Zero-downtime rolling, blue-green, canary releases, GitOps operators, and 12-factor configuration management.
- [CONTAINERIZATION.md](infrastructure/cicd/deployment/CONTAINERIZATION.md) — Secure multi-stage Docker builds, image optimizations (Alpine vs Distroless), and root vs non-root execution policies.

## Data

- [DATA-NORMALIZATION.md](data/DATA-NORMALIZATION.md) — Normalisation, denormalisation, and the decision framework.
- [EAV-PATTERN.md](data/EAV-PATTERN.md) — Entity–Attribute–Value pattern for flexible attribute modelling.

### Concurrency Control

- [CONCURRENCY-FOUNDATIONS.md](data/concurrency/CONCURRENCY-FOUNDATIONS.md) — Anomaly taxonomy, OCC vs PCC strategies, and decision framework. _(hub)_
- [MVCC-AND-ISOLATION.md](data/concurrency/MVCC-AND-ISOLATION.md) — PostgreSQL MVCC internals, tuple versioning, and isolation levels.
- [OPTIMISTIC-LOCKING.md](data/concurrency/OPTIMISTIC-LOCKING.md) — Version-based conflict detection, Lost Update problem, and TypeORM `@VersionColumn()`.
- [PESSIMISTIC-LOCKING.md](data/concurrency/PESSIMISTIC-LOCKING.md) — Row-level locks, deadlocks, advisory locks, and the overselling case study.
- [DISTRIBUTED-LOCKING.md](data/concurrency/DISTRIBUTED-LOCKING.md) — Redis SETNX, Redlock, fencing tokens, and lease-based coordination.

### Consistency

- [CONSISTENCY-FOUNDATIONS.md](data/consistency/CONSISTENCY-FOUNDATIONS.md) — ACID vs BASE, CAP/PACELC, and the consistency spectrum. _(hub)_
- [EVENTUAL-CONSISTENCY.md](data/consistency/EVENTUAL-CONSISTENCY.md) — Convergence models, read-after-write, caching implications, and CRDTs.
- [IDEMPOTENCY.md](data/consistency/IDEMPOTENCY.md) — Idempotency keys, exactly-once semantics, UPSERT, and the transactional outbox.
- [SAGAS-AND-COMPENSATION.md](data/consistency/SAGAS-AND-COMPENSATION.md) — Garcia-Molina Saga pattern, choreography vs orchestration, and compensating transactions.

### Database Performance

- [PERFORMANCE-FOUNDATIONS.md](data/performance/PERFORMANCE-FOUNDATIONS.md) — I/O cost model, selectivity, and the tuning workflow. _(hub)_
- [INDEX-INTERNALS.md](data/performance/INDEX-INTERNALS.md) — B-tree, Hash, GIN, GiST, and BRIN index structures.
- [INDEX-DESIGN.md](data/performance/INDEX-DESIGN.md) — Composite ordering, covering indexes, partial indexes, and applied strategy.
- [QUERY-ANALYSIS.md](data/performance/QUERY-ANALYSIS.md) — EXPLAIN ANALYZE, plan node types, red flags, and N+1 detection.
- [STORAGE-AND-MAINTENANCE.md](data/performance/STORAGE-AND-MAINTENANCE.md) — WAL, TOAST, autovacuum tuning, partitioning, and bulk operations.
- [CONNECTION-AND-REPLICATION.md](data/performance/CONNECTION-AND-REPLICATION.md) — Connection pooling, PgBouncer, memory config, and read replicas.

## Observability

- [OBSERVABILITY-FOUNDATION.md](observability/OBSERVABILITY-FOUNDATION.md) — The three pillars of observability.
- [METRICS.md](observability/metrics/METRICS.md) — Prometheus metric types, Golden Signals, RED/USE methods, and instrumentation best practices.
- [LOGS.md](observability/logs/LOGS.md) — Structured JSON logging, Winston configuration, and log levels.
- [TRACES.md](observability/traces/TRACES.md) — Correlation ID propagation and distributed tracing principles.

## Security

- [SECRETS-MANAGEMENT.md](security/SECRETS-MANAGEMENT.md) — Secrets lifecycle, rotation, and environment variable management.
- [JWT-RSA-JWKS.md](security/JWT-RSA-JWKS.md) — Technical reference for JSON Web Tokens, RSA cryptography, and JWKS.
- [ADMIN-BOOTSTRAP.md](security/ADMIN-BOOTSTRAP.md) — Secure super-admin bootstrap strategy with forced credential rotation.

## Integration

- [INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md) — Cross-module communication, ACL gateways, and event-driven patterns.

## Testing

- [TESTING-TASK-TEMPLATE.md](testing/TESTING-TASK-TEMPLATE.md) — Test plan templates and conventions.

## AI / Agentic Engineering

- [ai/README.md](ai/README.md) — Canonical AI engineering index with CAC v1, SPS v1, and EWC v1.
- [ai/FOUNDATIONS.md](ai/FOUNDATIONS.md) — Shared principles, risk model, and anti-patterns.
- [ai/CONVENTIONS.md](ai/CONVENTIONS.md) — Single source of truth for generation conventions used by skills.
- [ai/GOVERNANCE-AND-QUALITY-GATES.md](ai/GOVERNANCE-AND-QUALITY-GATES.md) — Definition of done, governance gates, escalation.
- [ai/WORKFLOW-PLAYBOOK.md](ai/WORKFLOW-PLAYBOOK.md) — End-to-end execution workflow for agents.
- [ai/SKILLS-SYSTEM.md](ai/SKILLS-SYSTEM.md) — Skill taxonomy, lifecycle, and SKILL.md standards.

---

## Feature Overview & Roadmap

- [FEATURES.md](FEATURES.md) — Detailed reference for every feature implemented in the API.
- [ROADMAP.md](ROADMAP.md) — Project-wide feature roadmap and phase tracking.
