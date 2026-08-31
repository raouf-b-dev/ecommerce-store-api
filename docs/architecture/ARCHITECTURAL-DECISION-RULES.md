# Architectural Decision Rules & Meta-Framework

This document defines meta-rules for evaluating when to introduce new architectural patterns, bounded contexts, or abstractions in `ecommerce-store-api`.

---

## 1. When to Introduce New Abstractions

| Trigger / Threshold                   | Required Architectural Action                                                                                                           | Evaluation Standard                                                                                                                  |
| :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **New Domain Context Required**       | Create new Bounded Context directory (`src/modules/[module]/`) with isolated domain, application, and primary/secondary adapter layers. | Explicit business domain separation (e.g. Orders vs Payments vs Inventory). Write-side contexts do not JOIN across modules. CQRS and Analytics read adapters may JOIN in this monolith ([CQRS.md](CQRS.md), [domains/ANALYTICS.md](domains/ANALYTICS.md)). |
| **Cross-Module Communication Needed** | Create an Anti-Corruption Layer (ACL) gateway (`secondary-adapters/gateways/`) or emit a Domain Event.                                  | Never inject repositories across bounded context boundaries. Use ACL interfaces or async domain events.                              |
| **Background Processing Needed**      | Introduce a BullMQ job handler (`primary-adapters/jobs/`), job scheduler, and worker processor.                                         | Long-running maintenance, reconciliation, or external integration tasks that should not block HTTP request/response loops.           |
| **State Caching Needed**              | Introduce a cached repository decorator in `secondary-adapters/repositories/cached-[module]-repository/`.                               | High read-to-write ratio queries where TTL-cached Redis lookups prevent database load. Cache logic MUST be transparent to use cases. |
| **Significant Design Change**         | Write a new Architecture Decision Record in `docs/architecture/adr/ADR-XXX-[topic].md`.                                                 | Any change altering persistence schemas, consistency guarantees, module boundaries, or transaction isolation policies.               |
