# Documentation Index

Technical reference for this repository, organised by layer.

---

## 1. System & Domain Architecture (Project Architecture)

### Core Architecture & System Principles

- [ARCHITECTURE.md](architecture/ARCHITECTURE.md): System context, bounded contexts, and domain flows.
- [ENGINEERING-PRINCIPLES.md](architecture/ENGINEERING-PRINCIPLES.md): Core architectural philosophy, evaluation criteria, and DDD/concurrency principles.
- [ARCHITECTURAL-DECISION-RULES.md](architecture/ARCHITECTURAL-DECISION-RULES.md): Meta-rules for introducing bounded contexts, gateways, job handlers, and ADRs.
- [DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md): Domain-Driven Design and Hexagonal Architecture principles.
- [CQRS.md](architecture/CQRS.md): Command/Query Responsibility Segregation evolution path.
- [API-VERSIONING.md](architecture/API-VERSIONING.md): URI versioning strategy, Anti-Corruption Layer DTO mapping, and deprecation protocol.
- [RATE-LIMITING.md](architecture/RATE-LIMITING.md): Rate limiting algorithms, tiered enforcement, storage backends, and HTTP conventions.

### Project Implementation Patterns (Codebase Conventions)

- [project-patterns/REPOSITORY-PATTERN.md](architecture/project-patterns/REPOSITORY-PATTERN.md): How repositories are implemented with NestJS abstract contracts and domain mapping.
- [project-patterns/RESULT-PATTERN.md](architecture/project-patterns/RESULT-PATTERN.md): Explicit error handling with `Result<T, E>` monad and controller unwrapping.

### Domain Architecture (System-Specific Domain Design)

- [domains/INVENTORY.md](architecture/domains/INVENTORY.md): Inventory domain architecture, aggregate boundaries, reservation lifecycle, consistency models, and invariants.

---

## 2. Architecture Decision Records (Historical "Why")

- [adr/ADR-0004-inventory-integrity-and-concurrency.md](architecture/adr/ADR-0004-inventory-integrity-and-concurrency.md): Rationale for removing persisted `totalQuantity`, CQRS read ports, enforcing atomic OCC, and read-only reconciliation.
- [adr/ADR-0005-typed-atomic-occ-update-contract.md](architecture/adr/ADR-0005-typed-atomic-occ-update-contract.md): Why every versioned aggregate uses QueryBuilder OCC, `UpdateFromEntity` payloads, and persistence-owned `version` / `updatedAt` stamps.
- [adr/ADR-0006-redis-fail-open-cache-aside.md](architecture/adr/ADR-0006-redis-fail-open-cache-aside.md): Why Redis cache-aside fails open, idempotency fails closed, and generation-based invalidation drops prior indexes.

---

## 3. Engineering Decision Guides ("How to Choose")

- [decision-guides/WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md](decision-guides/WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md): Decision matrix for choosing between OCC and pessimistic locking.
- [decision-guides/WHEN-TO-DENORMALIZE-DATA.md](decision-guides/WHEN-TO-DENORMALIZE-DATA.md): Evaluation framework and rules for normalizing vs denormalizing fields.
- [decision-guides/WHEN-TO-ADD-DATABASE-INDEXES.md](decision-guides/WHEN-TO-ADD-DATABASE-INDEXES.md): Index design, naming conventions, partial status indexing, and keyset requirements.

---

## 4. Database Architecture, Operations & Coding Standards

- [database/DATABASE-DESIGN.md](database/DATABASE-DESIGN.md): Data modeling decisions, aggregate persistence rules, and normalization strategies.
- [database/TRANSACTIONS.md](database/TRANSACTIONS.md): Transaction isolation policy and active implementation mappings.
- [database/INDEXES.md](database/INDEXES.md): Database indexing policy and provisioned index inventory.
- [database/DATABASE-STANDARDS.md](database/DATABASE-STANDARDS.md): Schema coding conventions, table/column naming, primary key types, and audit columns.

---

## 5. Infrastructure & Operations

### Process, Caching & Troubleshooting

- [PROCESS-LIFECYCLE.md](infrastructure/PROCESS-LIFECYCLE.md): Process Lifecycle Guide: PIDs, Signals & Graceful Shutdown.
- [REDIS.md](infrastructure/REDIS.md): Redis roles, fail-open degradation, key-space generation, and shared connection options (see also [ADR-0006](architecture/adr/ADR-0006-redis-fail-open-cache-aside.md)).
- [RELEASE-BACKUP-RECOVERY.md](infrastructure/RELEASE-BACKUP-RECOVERY.md): Release checklist, rollback matrix, `db:backup` / `db:restore`, smoke probes, restore drill.
- [TROUBLESHOOTING.md](infrastructure/TROUBLESHOOTING.md): Common issues and solutions for the API.

### CI/CD & Deployment

- [CICD-FOUNDATIONS.md](infrastructure/cicd/CICD-FOUNDATIONS.md): Portable CI/CD definitions, GitHub Actions runners, secrets, and deployment topologies.
- [PROJECT-PIPELINE.md](infrastructure/cicd/PROJECT-PIPELINE.md): Applied NestJS API workflow, parallel checks, dynamic Postgres/Redis container boots, and local verification hooks.
- [PIPELINE-OPTIMIZATION.md](infrastructure/cicd/pipeline/PIPELINE-OPTIMIZATION.md): Dependency caching, test parallelization state isolation, code quality gates, and SAST/SCA security audits.
- [DEPLOYMENT-STRATEGIES.md](infrastructure/cicd/deployment/DEPLOYMENT-STRATEGIES.md): Zero-downtime rolling, blue-green, canary releases, GitOps operators, and 12-factor configuration management.
- [CONTAINERIZATION.md](infrastructure/cicd/deployment/CONTAINERIZATION.md): Secure multi-stage Docker builds, image optimizations (Alpine vs Distroless), and root vs non-root execution policies.

---

## 6. Foundations & Theory (Timeless Concepts)

### Data Normalization

- [DATA-NORMALIZATION.md](data/DATA-NORMALIZATION.md): Normalisation, denormalisation, and the decision framework.
- [EAV-PATTERN.md](data/EAV-PATTERN.md): Entity-Attribute-Value pattern for flexible attribute modelling.

### Concurrency Control Theory

- [CONCURRENCY-FOUNDATIONS.md](data/concurrency/CONCURRENCY-FOUNDATIONS.md): Anomaly taxonomy, OCC vs PCC strategies, and decision framework.
- [MVCC-AND-ISOLATION.md](data/concurrency/MVCC-AND-ISOLATION.md): PostgreSQL MVCC internals, tuple versioning, and isolation levels.
- [OPTIMISTIC-LOCKING.md](data/concurrency/OPTIMISTIC-LOCKING.md): Version-based conflict detection, Lost Update problem, and TypeORM `@VersionColumn()`.
- [PESSIMISTIC-LOCKING.md](data/concurrency/PESSIMISTIC-LOCKING.md): Row-level locks, deadlocks, advisory locks, and the overselling case study.
- [DISTRIBUTED-LOCKING.md](data/concurrency/DISTRIBUTED-LOCKING.md): Redis SETNX, Redlock, fencing tokens, and lease-based coordination.

### Consistency Theory

- [CONSISTENCY-FOUNDATIONS.md](data/consistency/CONSISTENCY-FOUNDATIONS.md): ACID vs BASE, CAP/PACELC, and the consistency spectrum.
- [EVENTUAL-CONSISTENCY.md](data/consistency/EVENTUAL-CONSISTENCY.md): Convergence models, read-after-write, caching implications, and CRDTs.
- [IDEMPOTENCY.md](data/consistency/IDEMPOTENCY.md): Idempotency keys, exactly-once semantics, UPSERT, and the transactional outbox.
- [SAGAS-AND-COMPENSATION.md](data/consistency/SAGAS-AND-COMPENSATION.md): Garcia-Molina Saga pattern, choreography vs orchestration, and compensating transactions.

### Database Performance Theory

- [PERFORMANCE-FOUNDATIONS.md](data/performance/PERFORMANCE-FOUNDATIONS.md): I/O cost model, selectivity, and the tuning workflow.
- [INDEX-INTERNALS.md](data/performance/INDEX-INTERNALS.md): B-tree, Hash, GIN, GiST, and BRIN index structures.
- [INDEX-DESIGN.md](data/performance/INDEX-DESIGN.md): Composite ordering, covering indexes, partial indexes, and applied strategy.
- [QUERY-ANALYSIS.md](data/performance/QUERY-ANALYSIS.md): EXPLAIN ANALYZE, plan node types, red flags, and N+1 detection.
- [STORAGE-AND-MAINTENANCE.md](data/performance/STORAGE-AND-MAINTENANCE.md): WAL, TOAST, autovacuum tuning, partitioning, and bulk operations.
- [CONNECTION-AND-REPLICATION.md](data/performance/CONNECTION-AND-REPLICATION.md): Connection pooling, PgBouncer, memory config, and read replicas.

---

## 7. Observability, Security & Integration

### Observability

- [OBSERVABILITY-FOUNDATION.md](observability/OBSERVABILITY-FOUNDATION.md): The three pillars of observability.
- [METRICS.md](observability/metrics/METRICS.md): Prometheus metric types, Golden Signals, RED/USE methods, and instrumentation best practices.
- [LOGS.md](observability/logs/LOGS.md): Structured JSON logging, Winston configuration, and log levels.
- [TRACES.md](observability/traces/TRACES.md): Correlation ID propagation and distributed tracing principles.

### Security

- [SECRETS-MANAGEMENT.md](security/SECRETS-MANAGEMENT.md): Secrets lifecycle, injection patterns, and environment variable management.
- [SECRET-ROTATION.md](security/SECRET-ROTATION.md): Production secret rotation runbook (JWT, DB, Redis, metrics, third-party).
- [JWT-RSA-JWKS.md](security/JWT-RSA-JWKS.md): Technical reference for JSON Web Tokens, RSA cryptography, and JWKS.
- [ADMIN-BOOTSTRAP.md](security/ADMIN-BOOTSTRAP.md): Secure super-admin bootstrap strategy with forced credential rotation.

### Integration

- [INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md): Cross-module communication, ACL gateways, and event-driven patterns.

---

## 8. Feature Overview & Roadmap

- [FEATURES.md](FEATURES.md): Detailed reference for every feature implemented in the API.
- [ROADMAP.md](ROADMAP.md): Project-wide feature roadmap and phase tracking.

---

## 9. Development Guides

- [development/LOCAL-SETUP.md](development/LOCAL-SETUP.md): Environment files, auto-generated secrets, and first boot order.
- [development/SEEDING.md](development/SEEDING.md): Local seed accounts, catalog, and idempotency behavior.
