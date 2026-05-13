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

## Data

- [DATA-NORMALIZATION.md](data/DATA-NORMALIZATION.md) — Normalisation, denormalisation, and the decision framework.
- [EAV-PATTERN.md](data/EAV-PATTERN.md) — Entity–Attribute–Value pattern for flexible attribute modelling.

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
