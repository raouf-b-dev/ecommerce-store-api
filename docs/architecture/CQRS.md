# Command Query Responsibility Segregation (CQRS)

This document is a **hybrid CQRS reference**. Sections 1, 3, and 7 define the strict academic foundations of the CQRS pattern in a project-agnostic manner. The remaining sections map those foundations to this project's implementation. All contributors must read and follow this document.

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
> Source: Fowler (2011), _CQRS_, bliki

---

## 2. CQRS Topology: Single-Database

In this project, we implement a **Single-Database CQRS** topology. We maintain the logical separation of models and handlers while sharing the same underlying physical persistence (PostgreSQL).

### 2.1 The Command Stack (Writes)

The Command side is responsible for enforcing invariants, validating business rules, and shifting system state. It heavily utilises Domain-Driven Design (DDD) principles.

**Academic model:**

| Layer                | Responsibility                                                                                                                     | This Project                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Controller** | Accepts HTTP POST/PATCH/DELETE requests. Thin adapter: no logic. | `[module].controller.ts`: mutation endpoints |
| **Command Use Case** | Orchestrates the transaction. Validates input, coordinates domain objects and ports.                                               | `core/application/usecases/`                                                      |
| **Domain Entity**    | Fully encapsulated class with private fields, getters, and behavioural methods. Never exposes direct setters. Enforces invariants. | `core/domain/entities/`                                                           |
| **Repository**       | Standard DDD repository that deals exclusively with Domain Entities.                                                               | `core/domain/repositories/` (port) → `secondary-adapters/repositories/` (adapter) |

**Example workflow:**

`OrdersController (POST /checkout)` → `CheckoutUseCase` → Validates via ACL Gateways (`UserGateway`, `CartGateway`) → `OrderFactory.createFromCart()` → `OrderRepository.save()` → `OrderScheduler.scheduleCheckout()` (BullMQ SAGA flow).

`OrdersController (PATCH /confirm)` → `ConfirmOrderUseCase` → Loads `Order` from repository → Invokes `Order.confirm()` (domain behaviour method) → `OrderRepository.updateStatus()`.

### 2.2 The Query Stack (Reads)

The Query side exists to fulfill UI projection requirements as simply and performantly as possible in the **academically ideal** CQRS model.

**Academic model (Young, 2010; Vernon, 2013):**

| Layer             | Responsibility                                                                                                                                        | Ideal Implementation                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Controller**    | Accepts HTTP GET requests.                                                                                                                            | Dedicated query controller or shared controller with query-only endpoints                |
| **Query Handler** | Directly interacts with the database or read-optimised views. Bypasses the Domain layer **entirely**: no entity instantiation, no behavioural logic. | Thin use case that delegates to a read-specific repository or raw query |
| **Read Model**    | Flat DTO or interface shaped strictly for what the client needs. No behavioural logic, no encapsulated private fields.                                | Purpose-built DTOs per screen/projection (e.g., `OrderListItemDTO`, `PaymentSummaryDTO`) |
| **Execution**     | Can utilise raw SQL, `QueryBuilder` projections, database VIEWs, or Redis cache lookups to return data without instantiating rich Domain Entities.    | Read-optimised repository methods returning plain objects                                |

> **Why bypass the Domain layer?** (Young, 2010)
>
> Domain Entities are designed for **write invariant enforcement**, not read performance. Hydrating a full Aggregate with all its encapsulated fields, value objects, and validation logic just to serialize it back to JSON is architecturally wasteful. In a strict CQRS model, the query path should return flat projections directly from persistence, avoiding the "N+1 hydration tax" of constructing rich domain objects for display.

#### 2.2.1 The N+1 Query Problem: Why Read-Path Performance Demands CQRS

The **N+1 query problem** is one of the most damaging performance anti-patterns in ORM-backed applications and is the primary reason why the CQRS query path must bypass the domain layer.

**Definition**: The N+1 problem occurs when an application executes **1 query** to fetch a list of N parent records, then executes **N additional queries** (one per record) to fetch each parent's related data. For a list of 50 orders, fetching the customer name, payment status, and product details through individual lookups produces 1 + 50 + 50 + 50 = **151 database round-trips**: instead of the single JOIN query that would return the same data.

> _"The most common performance problem I've seen in enterprise applications is the N+1 query problem: fetching a list of entities and then lazily loading their associations one by one."_
> Source: Kleppmann, _Designing Data-Intensive Applications_ (2017), Ch. 2

**Why DDD/Hexagonal Architecture amplifies the risk**:

In a DDD architecture with strict bounded contexts, the N+1 problem is especially dangerous because cross-context data (e.g., user details for the Orders context) cannot be fetched via ORM relations: it must go through ACL Gateways. Each gateway call is a method invocation through a port → adapter → upstream service chain. If the read path resolves details by calling `userGateway.validateUser(id)` inside a loop for each order, the performance is catastrophic:

```
// ❌ ANTI-PATTERN: N+1 via ACL Gateway in a query use case
const orders = await this.orderRepo.listOrders(filters);   // 1 query
for (const order of orders) {
  const user = await this.userGateway.validateUser(order.userId);  // N queries
  const payment = await this.paymentGateway.getPayment(order.paymentId);      // N queries
 // Total: 1 + N + N queries: unacceptable
}
```

**Impact at scale**:

| List Size | Naive N+1 (3 relations) | Single JOIN Query | Ratio |
| --------- | ----------------------- | ----------------- | ----- |
| 20 items  | 61 queries              | 1 query           | 61×   |
| 50 items  | 151 queries             | 1 query           | 151×  |
| 100 items | 301 queries             | 1 query           | 301×  |

Each additional query adds network round-trip latency (typically 0.5-2ms per PostgreSQL query in a local network). At 50 items with 3 relations, the N+1 approach adds **75-300ms of pure query overhead** compared to a single JOIN.

> _"The API Composition pattern queries each service that owns the data and then combines the results. [...] The drawbacks are increased latency (multiple network calls) and reduced availability (if any provider is unavailable, the entire query fails)."_
> Source: Richardson, _Microservices Patterns_ (2018), Ch. 7 §7.2

**The CQRS solution**: Dedicated query ports with infrastructure-optimised adapters that resolve all related data in a **single query**: either via SQL JOINs (monolith) or batched API calls (microservices). This eliminates the N+1 problem entirely while preserving bounded context integrity at the port level. See §5.3 and §6 Phase 2 for the full pattern.

**Current implementation status:**

Query use cases currently go through the same `OrderRepository` and hydrate full domain entities, then call `.toPrimitives()` to produce a serializable response:

```
Controller (GET) → ListOrdersUseCase → OrderRepository.listOrders()
  → Returns Order[]  (full domain entities with 549-line class)
  → Use case maps: order.toPrimitives()
  → Returns IOrder[]  (entity's own primitive interface)
```

This is a **pragmatic Phase 1 approach** that prioritises delivery speed. The architecture is designed to evolve toward dedicated read models without changing application-layer contracts (see §6).

### 2.3 Controller Organisation

**Academic recommendation:** Strict CQRS advocates (Young, 2010) recommend **separate controllers** for reads and writes, reinforcing the segregation at the adapter level. This makes the split explicit and enables separate scaling, middleware, and caching strategies per side.

**Current state:** This project uses a **single controller per resource** (e.g., `OrdersController`) that handles both GET (queries) and POST/PATCH/DELETE (commands). This is acceptable for Single-Database CQRS in a monolith: the logical segregation happens at the use case level, not the controller level.

### 2.4 The `Result<T, E>` Pattern Across Both Stacks

Both command and query use cases in this project return `Result<T, E>`: a shared-kernel monadic type that encapsulates success or failure without throwing exceptions. This is **not a CQRS requirement**, but a project convention that provides type-safe error handling across both stacks.

All use cases implement the same generic interface:

```typescript
interface UseCase<Input, Output, Error> {
  execute(input: Input): Promise<Result<Output, Error>>;
}
```

This means command and query use cases share a **structural contract**: the differentiation is in their semantics (mutation vs. projection), not their interface shape. This is an intentional simplification for a unified monolithic codebase.

---

## 3. Why This Approach?

By utilising Single-DB CQRS, this platform achieves:

1. **Architectural Purity**: Business logic is never polluted by presentation requirements. UI caching requirements never dictate domain invariants.
2. **Strong Consistency**: Since both stacks share one PostgreSQL database, reads always see the latest committed writes. There is **no eventual consistency**, no read-replica lag, and no stale projection risk. This is a significant advantage over dual-database CQRS topologies.
3. **Simplicity**: We avoid the massive operational complexity overhead of Event Sourcing and distributed eventual consistency, which is generally unwarranted for standard e-commerce workflows.
4. **Performance Path**: The architecture is structured so that read paths can be independently optimised (dedicated read repositories, database views, Redis caching) without changing the application-layer contracts.

---

## 4. Data Scoping on the Query Path

A concern unique to the query stack is **row-level data scoping**: restricting which records a user can see based on their role and permissions. In the E-Commerce Store API, this manifests as:

- Customers see only their own orders (e.g., `ListOrdersUseCase` filters by `userId`)
- Admins with `view_all_orders` permission see all orders
- Payment data is restricted: customers should never see other customers' payment details

> **Academic note:** In advanced CQRS implementations, data scoping is typically enforced at the **read model projection level**: each user's read model contains only the data they are authorised to see. In Single-DB CQRS, scoping is handled at the query use case level as a guard before repository access.

---

## 5. CQRS and Cross-Context Patterns

### 5.1 ACL Gateways (Command Stack Only)

Cross-context validation happens exclusively on the **command side**. When `CheckoutUseCase` needs to validate that a user exists and a cart is valid, it calls the appropriate ACL Gateway ports (`UserGateway`, `CartGateway`). Command use cases enforce invariants; they must never bypass the ACL boundary.

On the **query side**, the approach differs depending on the CQRS evolution phase (see §6). In Phase 1, query use cases return whatever data is in their own context's persistence (IDs only). From Phase 2 onwards, query **adapters** may perform controlled cross-context reads (e.g., SQL JOINs in a monolith, batched API calls in microservices) to resolve names alongside IDs: but this is an **adapter-level concern**, not an application-layer concern. The query port contract remains infrastructure-agnostic and never exposes foreign domain concepts.

This asymmetry is intentional: command use cases enforce invariants via ACL Gateways; query adapters optimise projections for presentation. See [`INTEGRATION-PATTERNS.md`](../integration/INTEGRATION-PATTERNS.md) §2 for full ACL Gateway documentation.

### 5.2 Domain Events (Command Stack Only)

Domain events (e.g., `order.created`, `cart.checkout.initiated`) are emitted **exclusively from command use cases** after successful persistence. They represent facts about state changes: a purely command-side concern. Subscribing contexts react via their own command use cases.

> _"Domain Events are raised by the write side and consumed to update the read side."_
> Source: Vernon, _Implementing Domain-Driven Design_ (2013), Ch. 8

See [`INTEGRATION-PATTERNS.md`](../integration/INTEGRATION-PATTERNS.md) for full Domain Events documentation.

### 5.3 Cross-Context Query Performance: The N+1 Boundary Problem

When a query needs data from multiple bounded contexts (e.g., Orders needs user details from Identity, product names from Products, payment status from Payments), three approaches exist. This project uses **Approach 3** for the modular monolith.

#### Approach 1: N+1 via ACL Gateways: ❌ Rejected

Call ACL Gateways in a loop to resolve each foreign ID to a name. This respects DDD boundaries perfectly but produces catastrophic N+1 performance (see §2.2.1). Even batching the calls (`userGateway.batchGetNames([id1, id2, ...])`) still routes through the full port → adapter → service → repository chain, constructing objects at every layer: unnecessary overhead for read-only projections.

> This approach is **never acceptable** for list/search endpoints in this project.

#### Approach 2: Data Duplication via Events: ⏸️ Deferred

Store name/details snapshots in the owning context's own tables (e.g., `order_user_snapshots`), kept in sync by domain event listeners. This is the **academically pure distributed systems solution** (Richardson, 2018, Ch. 7) and the correct approach when bounded contexts live in separate databases.

However, for a single-database modular monolith, it introduces significant complexity (event handlers, snapshot tables, staleness windows, consistency guarantees) to avoid a JOIN that costs 0ms because the tables are co-located. This is **over-engineering for the current architecture** and is deferred until microservice extraction requires it.

> _"Don't distribute your data until you have to. [...] A single database is a wonderful thing: it gives you ACID transactions, consistent reads, and simple operations."_
> Source: Kleppmann, _Designing Data-Intensive Applications_ (2017), Ch. 12

#### Approach 3: Dedicated Query Ports with Cross-Context JOINs: ✅ Adopted

Introduce a dedicated query port (`OrderQueryService`) in the application layer, separate from the domain repository. The adapter implements this port using SQL JOINs that cross bounded context table boundaries in a single optimised query.

**Why this is architecturally sound**:

1. **The boundary crossing is isolated in the adapter**: the port contract returns infrastructure-agnostic DTOs and makes zero assumptions about how the data is fetched
2. **The write path is completely unaffected**: command use cases continue using ACL Gateways exclusively
3. **The port contract survives microservice extraction**: swap the SQL JOIN adapter for a batched HTTP adapter; the use case doesn't change
4. **It eliminates N+1 entirely**: one query returns all data, regardless of list size

**The critical design rules**:

- Query ports live in `core/application/ports/`: **never** in `core/domain/repositories/`
- Query adapters live in `secondary-adapters/query/`: **never** mixed with write repository adapters
- Query adapters return flat DTOs: **never** domain entities
- Cross-context JOINs are documented in the adapter with comments identifying the foreign context, the rationale, and the microservice migration path
- The domain `OrderRepository` must **never** contain read-projection methods or return presentation DTOs

For the evolution path from Phase 1 (shared repository) to Phase 4 (separate read database), see §6.

---

## 6. Evolution Path

The current `toPrimitives()` approach is a Phase 1 pragmatic choice. The architecture supports a natural evolution toward stricter CQRS separation:

### Phase 1: Current: Shared Repository (✅ Implemented)

```
Query UseCase → Same Repository → Domain Entity → .toPrimitives() → Response
```

- **Advantage**: Fast to implement, no duplication
- **Cost**: Read path hydrates full domain entities unnecessarily

### Phase 2: Dedicated Query Ports

```
Query UseCase → QueryService (port) → QueryAdapter → SQL projection → Plain DTO[] → Response
```

Introduce a **dedicated query port** (`OrderQueryService`) in the application layer: separate from the domain `OrderRepository`. The query port returns flat, presentation-optimized DTOs (e.g., `OrderListItemDTO`). The adapter implements the port using `QueryBuilder().select([...]).getRawMany()`, bypassing domain entity hydration entirely.

**Critical distinction**: The query port lives in `core/application/ports/`, NOT in `core/domain/repositories/`. The domain repository is a write-side concept: it manages aggregates and must never depend on presentation DTOs.

**Cross-context read access**: In a single-database modular monolith, the query adapter may perform controlled `LEFT JOIN` operations against tables owned by other bounded contexts (e.g., `users`, `payments`, `products`) to resolve names alongside IDs. This is a **deliberate pragmatic compromise** acceptable only because:

1. The query path never mutates state: reads can't break invariants
2. The query adapter never hydrates domain entities: no aggregate construction
3. The port contract is infrastructure-agnostic: it returns DTOs, not domain objects
4. On microservice extraction, only the adapter changes (from SQL JOIN to batched HTTP/gRPC calls): the port contract stays identical

The write path continues using ACL Gateways exclusively: cross-context JOINs are **never** allowed on the command side.

### Phase 3: Dedicated Read Repositories (Separate Port Implementations)

```
Query UseCase → OrderQueryService (port) → Optimised SQL / DB Views / Redis → DTO[] → Response
```

The `OrderQueryService` port from Phase 2 remains unchanged. The adapter evolves to use more aggressive optimisations: database VIEWs, materialised views, Redis-cached projections, or purpose-built read tables. The write-side `OrderRepository` remains untouched.

### Phase 4: Separate Read Database (Microservices)

```
Command → Write DB → Domain Events → Read DB projection
Query UseCase → QueryService → Read Repository → Read DB
```

Full CQRS with separate read and write stores, connected via domain events and projections. The query adapter replaces SQL JOINs with batched API calls to upstream services. This is the endgame for microservice deployments at scale.

> **Key insight**: Each phase requires changes only in the **adapter layer**. The application use case contracts and port interfaces remain stable: this is the Hexagonal Architecture payoff.

---

## 7. References & Academic Reading

1. Meyer, B. (1988). _Object-Oriented Software Construction_. Prentice Hall. ISBN 978-0136291558. (Introduces the foundational Command-Query Separation principle).
2. Young, G. (2010). _CQRS Documents_. https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf (The seminal working documents defining CQRS boundaries independently of Event Sourcing).
3. Evans, E. (2003). _Domain-Driven Design: Tackling Complexity in the Heart of Software_. Addison-Wesley. ISBN 978-0321125217. (Provides the basis for the Command-side Aggregate management strategies: Ch. 5, 6, 14).
4. Vernon, V. (2013). _Implementing Domain-Driven Design_. Addison-Wesley. ISBN 978-0321834577. (Detailed tactical implementation of CQRS with DDD, including Domain Events and read model projections: Ch. 4, 8, 14).
5. Fowler, M. (2011). _CQRS_. bliki. https://martinfowler.com/bliki/CQRS.html
6. Richardson, C. (2018). _Microservices Patterns_. Manning. ISBN 978-1617294549. (CQRS in the context of microservices, API Composition pattern for cross-service queries, and the N+1 problem in distributed systems: Ch. 7 §7.2).
7. Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. ISBN 978-1449373320. (Data modelling trade-offs, N+1 query problem in ORM-backed applications, and the case for co-located data in monolithic architectures: Ch. 2, 12).
8. Millett, S. & Tune, N. (2015). _Patterns, Principles, and Practices of Domain-Driven Design_. Wrox. ISBN 978-1118714706. (Read model projections in bounded context architectures, cross-context query strategies: Ch. 25).

