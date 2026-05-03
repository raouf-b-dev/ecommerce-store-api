# Command Query Responsibility Segregation (CQRS)

This document is the **canonical CQRS reference** for E-commerce API. It defines the strict academic foundations of the pattern and maps them to this project's implementation. All contributors must read and follow this document.

> **Companion docs**: [`DDD-HEXAGONAL.md`](DDD-HEXAGONAL.md) (strict DDD & Hex rules), [`ARCHITECTURE.md`](ARCHITECTURE.md) (system context & domain flows), [`INTEGRATION-PATTERNS.md`](INTEGRATION-PATTERNS.md) (cross-context communication)

---

## 1. Academic & Theoretical Background

CQRS (Command Query Responsibility Segregation) is an architectural pattern that separates the models used for updating information (Commands) from the models used for reading information (Queries).

### 1.1 Origins

The CQRS pattern was first formally described by **Greg Young** and **Udi Dahan** in the late 2000s. It is an evolution of **CQS (Command-Query Separation)**, an object-oriented design principle originally coined by **Bertrand Meyer** in his work on the Eiffel programming language (Meyer, 1988: _Object-Oriented Software Construction_).

- **CQS (Meyer)** states that every method should either be a command that performs an action (mutates state) or a query that returns data to the caller, but not both. _"Asking a question should not change the answer."_
- **CQRS (Young/Dahan)** elevates this principle from the method level to the architectural level. It proposes using entirely different object models, interfaces, and sometimes databases for reading vs. writing.

### 1.2 Core Capabilities

By segregating commands from queries, CQRS fundamentally enables:

1. **Asymmetrical Optimization**: Reads outnumber writes in most enterprise software by massive margins (often 100:1 or more). A unified model forces read-queries to navigate write-focused relational constraints, or forces writes to maintain read-focused denormalizations. CQRS allows independent optimization of both paths.
2. **Simplified Mental Models**: Write models can enforce complex, strict invariants (DDD Aggregates) without needing to worry about how that data will be shaped for UI consumption. Read models can be "thin" data projections optimized strictly for screen representations (Young, 2010).
3. **Independent Scaling**: In distributed systems, command handlers and query handlers can be deployed and scaled independently based on their specific workload bottlenecks.

### 1.3 The "Myth" of CQRS

A common misconception in the software industry is that CQRS _requires_ Event Sourcing and multiple physical databases. **This is academically false.**

Greg Young explicitly states:

> _"CQRS is simply the creation of two objects where there was previously only one. The separation occurs based upon whether the methods are a command or a query... That is it. CQRS does not mandate event sourcing. CQRS does not mandate two databases."_

Martin Fowler further reinforces that CQRS should be applied selectively:

> _"Like any pattern, CQRS is useful in some places, but not in others. [...] For some it's a small step from there to a requirement for separate databases, and you don't need to add that. I think this is quite a dangerous approach since CQRS is a significant mental-leap for most people."_
> — Fowler (2011), _CQRS_, bliki

---

## 2. CQRS Topology: Single-Database

In this project, we implement a **Single-Database CQRS** topology. We maintain the logical separation of models and handlers while sharing the same underlying physical persistence (PostgreSQL).

### 2.1 The Command Stack (Writes)

The Command side is responsible for enforcing invariants, validating business rules, and shifting system state. It heavily utilises Domain-Driven Design (DDD) principles.

**Academic model:**

| Layer                | Responsibility                                                                                                                     | This Project                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Controller**       | Accepts HTTP POST/PATCH/DELETE requests. Thin adapter — no logic.                                                                  | `[module].controller.ts` — mutation endpoints                                     |
| **Command Use Case** | Orchestrates the transaction. Validates input, coordinates domain objects and ports.                                               | `core/application/use-cases/`                                                     |
| **Domain Entity**    | Fully encapsulated class with private fields, getters, and behavioural methods. Never exposes direct setters. Enforces invariants. | `core/domain/entities/`                                                           |
| **Repository**       | Standard DDD repository that deals exclusively with Domain Entities.                                                               | `core/domain/repositories/` (port) → `secondary-adapters/repositories/` (adapter) |

**Example workflow:**

`ActivitiesController (POST)` → `CreateActivityUseCase` → Validates cross-context references via ACL Gateways → Instantiates `Activity` via `fromPrimitives()` → `ActivityRepository.save()`.

`ActivitiesController (PATCH /start)` → `StartActivityUseCase` → Loads `Activity` from repository → Invokes `Activity.start()` (domain behaviour method) → `ActivityRepository.update()`.

### 2.2 The Query Stack (Reads)

The Query side exists to fulfill UI projection requirements as simply and performantly as possible in the **academically ideal** CQRS model.

**Academic model (Young, 2010; Vernon, 2013):**

| Layer             | Responsibility                                                                                                                                        | Ideal Implementation                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Controller**    | Accepts HTTP GET requests.                                                                                                                            | Dedicated query controller or shared controller with query-only endpoints                |
| **Query Handler** | Directly interacts with the database or read-optimised views. Bypasses the Domain layer **entirely** — no entity instantiation, no behavioural logic. | Thin use case that delegates to a read-specific repository or raw query                  |
| **Read Model**    | Flat DTO or interface shaped strictly for what the client needs. No behavioural logic, no encapsulated private fields.                                | Purpose-built DTOs per screen/projection (e.g., `ActivityListItemDTO`, `UserSummaryDTO`) |
| **Execution**     | Can utilise raw SQL, `QueryBuilder` projections, database VIEWs, or Redis cache lookups to return data without instantiating rich Domain Entities.    | Read-optimised repository methods returning plain objects                                |

> **Why bypass the Domain layer?** (Young, 2010)
>
> Domain Entities are designed for **write invariant enforcement**, not read performance. Hydrating a full Aggregate with all its encapsulated fields, value objects, and validation logic just to serialize it back to JSON is architecturally wasteful. In a strict CQRS model, the query path should return flat projections directly from persistence, avoiding the "N+1 hydration tax" of constructing rich domain objects for display.

**Current implementation status:**

Query use cases currently go through the same `ActivityRepository` and hydrate full domain entities, then call `.toPrimitives()` to produce a serializable response:

```
Controller (GET) → FindAllActivitiesUseCase → ActivityRepository.findAll()
  → Returns PaginatedResult<Activity>  (full domain entities)
  → Use case maps: activity.toPrimitives()
  → Returns ActivityProps[]  (entity's own primitive interface)
```

This is a **pragmatic Phase 1 approach** that prioritises delivery speed. The architecture is designed to evolve toward dedicated read models without changing application-layer contracts (see §6).

### 2.3 Controller Organisation

**Academic recommendation:** Strict CQRS advocates (Young, 2010) recommend **separate controllers** for reads and writes, reinforcing the segregation at the adapter level. This makes the split explicit and enables separate scaling, middleware, and caching strategies per side.

**Current state:** This project uses a **single controller per resource** (e.g., `ActivitiesController`) that handles both GET (queries) and POST/PATCH/DELETE (commands). This is acceptable for Single-Database CQRS in a monolith — the logical segregation happens at the use case level, not the controller level.

### 2.4 The `Result<T, E>` Pattern Across Both Stacks

Both command and query use cases in this project return `Result<T, E>` — a shared-kernel monadic type that encapsulates success or failure without throwing exceptions. This is **not a CQRS requirement**, but a project convention that provides type-safe error handling across both stacks.

All use cases implement the same generic interface:

```typescript
interface UseCase<Input, Output, Error> {
  execute(input: Input): Promise<Result<Output, Error>>;
}
```

This means command and query use cases share a **structural contract** — the differentiation is in their semantics (mutation vs. projection), not their interface shape. This is an intentional simplification for a unified monolithic codebase.

---

## 3. Why This Approach?

By utilising Single-DB CQRS, this platform achieves:

1. **Architectural Purity**: Business logic is never polluted by presentation requirements. UI caching requirements never dictate domain invariants.
2. **Strong Consistency**: Since both stacks share one PostgreSQL database, reads always see the latest committed writes. There is **no eventual consistency**, no read-replica lag, and no stale projection risk. This is a significant advantage over dual-database CQRS topologies.
3. **Simplicity**: We avoid the massive operational complexity overhead of Event Sourcing and distributed eventual consistency, which is generally unwarranted for standard E-commerce workflows.
4. **Performance Path**: The architecture is structured so that read paths can be independently optimised (dedicated read repositories, database views, Redis caching) without changing the application-layer contracts.

---

## 4. Data Scoping on the Query Path

A concern unique to the query stack is **row-level data scoping** — restricting which records a user can see based on their role and permissions. In the E-commerce API, this manifests as:

- Non-privileged users see only their own records (e.g., `GetUsersListUseCase` checks `canViewAllUsers`)
- Privileged users (admin, manager) see all records

> **Academic note:** In advanced CQRS implementations, data scoping is typically enforced at the **read model projection level** — each user's read model contains only the data they are authorised to see. In Single-DB CQRS, scoping is handled at the query use case level as a guard before repository access.

---

## 5. CQRS and Cross-Context Patterns

CQRS interacts with other architectural patterns in this project:

### 5.1 ACL Gateways (Command Stack Only)

Cross-context validation happens exclusively on the **command side**. When `CreateActivityUseCase` needs to validate that a partner or user exists, it calls the appropriate ACL Gateway port. Query use cases do **not** perform cross-context lookups — they return whatever data is in their own context's persistence.

This asymmetry is intentional: command use cases enforce invariants; query use cases merely project stored state. See [`INTEGRATION-PATTERNS.md`](INTEGRATION-PATTERNS.md) §2 for full ACL Gateway documentation.

### 5.2 Domain Events (Command Stack Only)

Domain events (e.g., `partner.deactivated`, `user.deactivated`) are emitted **exclusively from command use cases** after successful persistence. They represent facts about state changes — a purely command-side concern. Subscribing contexts react via their own command use cases.

> _"Domain Events are raised by the write side and consumed to update the read side."_
> — Vernon, _Implementing Domain-Driven Design_ (2013), Ch. 8

See [`INTEGRATION-PATTERNS.md`](INTEGRATION-PATTERNS.md) §3 for full Domain Events documentation.

---

## 6. Evolution Path

The current `toPrimitives()` approach is a Phase 1 pragmatic choice. The architecture supports a natural evolution toward stricter CQRS separation:

### Phase 1: Current — Shared Repository (✅ Implemented)

```
Query UseCase → Same Repository → Domain Entity → .toPrimitives() → Response
```

- **Advantage**: Fast to implement, no duplication
- **Cost**: Read path hydrates full domain entities unnecessarily

### Phase 2: Dedicated Read Methods on Repository

```
Query UseCase → Repository.findAllProjected() → Plain DTO[] → Response
```

Add query-specific methods on the existing repository that return flat projections via `QueryBuilder().select([...]).getRawMany()`, bypassing domain entity hydration.

### Phase 3: Dedicated Read Repositories

```
Query UseCase → ActivityReadRepository (port) → QueryBuilder/Raw SQL → DTO[] → Response
```

Introduce a separate read-only repository port in the application layer. The adapter can use optimised SQL, database views, or Redis cache. The write-side `ActivityRepository` remains untouched.

### Phase 4: Separate Read Database (Microservices)

```
Command → Write DB → Domain Events → Read DB projection
Query UseCase → Read Repository → Read DB
```

Full CQRS with separate read and write stores, connected via domain events and projections. This is the endgame for microservice deployments at scale.

> **Key insight**: Each phase requires changes only in the **adapter layer** (repositories). The application use case contracts remain stable — this is the Hexagonal Architecture payoff.

---

## 7. References & Academic Reading

1. Meyer, B. (1988). _Object-Oriented Software Construction_. Prentice Hall. (Introduces the foundational Command-Query Separation principle).
2. Young, G. (2010). _CQRS Documents_. (The seminal working documents defining CQRS boundaries independently of Event Sourcing).
3. Evans, E. (2003). _Domain-Driven Design: Tackling Complexity in the Heart of Software_. Addison-Wesley. (Provides the basis for the Command-side Aggregate management strategies).
4. Vernon, V. (2013). _Implementing Domain-Driven Design_. Addison-Wesley. (Detailed tactical implementation of CQRS with DDD, including Domain Events and read model projections — Ch. 4, 8, 14).
5. Fowler, M. (2011). _CQRS_. bliki. https://martinfowler.com/bliki/CQRS.html
6. Richardson, C. (2018). _Microservices Patterns_. Manning. (CQRS in the context of microservices, event-driven projections, and the Transactional Outbox pattern — Ch. 7).
