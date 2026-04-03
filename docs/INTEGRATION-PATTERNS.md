# Integration Patterns — Cross-Context Communication Reference

This document defines the **canonical integration patterns** for communicating between Bounded Contexts in the E-commerce Store API. Each pattern is grounded in DDD and Hexagonal Architecture, with explicit guidance on when to use it, how it maps to this codebase, and how it adapts when migrating to microservices.

> **Companion docs**: [`DDD-HEXAGONAL.md`](DDD-HEXAGONAL.md) (strict DDD & Hex rules), [`ARCHITECTURE.md`](ARCHITECTURE.md) (system context & flows)

---

## Quick Decision Matrix

| Scenario                                          | Pattern                    | Direction                     | Coupling       |
| ------------------------------------------------- | -------------------------- | ----------------------------- | -------------- |
| Defer my own module's work (retry, cron, batch)   | **Job Scheduler**          | Self → Self                   | None           |
| Query data from another context                   | **ACL Gateway**            | Downstream → Upstream         | Unidirectional |
| Command another context and wait for result       | **ACL Gateway**            | Downstream → Upstream         | Unidirectional |
| Something happened here, others may need to react | **Domain Events**          | Publisher → Bus → Subscribers | None           |
| Multi-step workflow across contexts with rollback | **Saga / Process Manager** | Orchestrator → Participants   | Orchestrated   |
| Guarantee event delivery after DB commit          | **Transactional Outbox**   | Publisher → Outbox → Bus      | None           |

### The Litmus Test

```
1. Is the work within the SAME Bounded Context?
   └─ YES → Job Scheduler
   └─ NO  → Continue ↓

2. Does the caller NEED a response?
   └─ YES → ACL Gateway
   └─ NO  → Continue ↓

3. Is it a single fire-and-forget reaction?
   └─ YES → Domain Events
   └─ NO  → Continue ↓

4. Is it a multi-step workflow requiring compensation?
   └─ YES → Saga / Process Manager
```

---

## Pattern 1: Job Scheduler

> **Purpose**: Defer a module's **own work** to run later — cron jobs, retries, batch processing.

The Job Scheduler is an **infrastructure concern**, not a DDD tactical pattern. In Hexagonal Architecture, the queue producer is a **secondary adapter** and the job handler is a **primary adapter** that drives the application core.

### When to Use

- ✅ Deferred execution within the **same** Bounded Context
- ✅ Cron-triggered periodic work
- ✅ Retry logic for unreliable operations
- ❌ **NEVER** for cross-context communication
- ❌ **NEVER** enqueue on another module's queue

### Architecture

```
┌─────────────── MODULE A ───────────────────────────┐
│                                                     │
│  Application Core                                   │
│  ├── UseCase → SchedulerPort.scheduleX()            │
│  └── ports/module-a.scheduler.ts (abstract class)   │
│                                                     │
│  Secondary Adapter (producer)                       │
│  └── schedulers/bullmq.module-a-scheduler.ts        │
│      └── moduleAQueue.add(JOB_NAME, payload)        │
│                                                     │
│  Primary Adapter (consumer)                         │
│  ├── module-a.processor.ts (WorkerHost router)      │
│  └── jobs/my-job.process.ts (BaseJobHandler)        │
│      └── calls UseCase.execute()                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### This Project — Implemented ✅

BullMQ queues for Orders (checkout SAGA steps) and Notifications (save → send → update flow).

```typescript
// Port: notifications/core/application/ports/notification.scheduler.ts
export abstract class NotificationScheduler {
  abstract scheduleNotification(
    notification: Notification,
  ): Promise<Result<{ jobIds: string[] }, InfrastructureError>>;
}

// Adapter: notifications/secondary-adapters/schedulers/bullmq.notification-scheduler.ts
@Injectable()
export class BullMqNotificationSchedulerImpl implements NotificationScheduler {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  async scheduleNotification(notification: Notification) {
    // Uses FlowProducer for ordered save → send → update chain
    const job = await this.flowProducer.add(/*...*/);
    return Result.success({ jobIds: [job.job.id] });
  }
}
```

### Microservice Migration

| Monolith                                | Microservice                         |
| --------------------------------------- | ------------------------------------ |
| BullMQ queue (Redis-backed)             | Same BullMQ or AWS SQS / Cloud Tasks |
| Queue registered in NestJS module       | Queue internal to the service        |
| **No change needed** — already isolated | ✅                                   |

---

## Pattern 2: ACL Gateway (Anti-Corruption Layer)

> **Purpose**: Request something **from another context** — query data or command an action — while translating between domain models to prevent leakage.

> _"Create an isolating layer to provide clients with functionality in terms of their own domain model."_
> — Evans, _Domain-Driven Design_ (2003), Ch. 14

### When to Use

- ✅ Downstream context needs **data from** upstream (synchronous query)
- ✅ Downstream context needs to **command** upstream and **wait for the result**
- ✅ Models differ between contexts and need **translation**
- ❌ **NEVER** bidirectional — if you need A→B _and_ B→A, your context boundaries are wrong
- ❌ **NEVER** for fire-and-forget side effects (use Domain Events)

### Architecture

```
┌─── DOWNSTREAM (Orders) ──────────────┐     ┌─── UPSTREAM (Customers) ───┐
│                                       │     │                            │
│  CheckoutUseCase                      │     │  FindCustomerUseCase       │
│  └── customerGateway.getCustomer()    │     │         ▲                  │
│                                       │     │         │                  │
│  Port (application layer)             │     │         │                  │
│  └── ports/customer.gateway.ts        │     │         │                  │
│      (defines CustomerCheckoutInfo)   │     │         │                  │
│                                       │     │         │                  │
│  ACL Adapter (secondary adapter)      │     │         │                  │
│  └── gateways/customer-gateway ───────┼────►│    (direct call in        │
│      (translates Customer → DTO)      │     │     monolith, HTTP in     │
│                                       │     │     microservices)         │
└───────────────────────────────────────┘     └────────────────────────────┘
```

### Critical Rules

1. **Unidirectional only** — Downstream calls upstream. Bidirectional = DDD anti-pattern.
2. **Port defines downstream DTOs** — The port never exposes upstream entities.
3. **Only ACL adapters import upstream code** — The application core sees only its own gateway port.
4. **Adapter injects upstream Use Cases** (not Repositories) — Preserves upstream invariants.

### This Project — Implemented ✅ (7 Gateways)

| Gateway                       | Downstream → Upstream | What It Wraps                          |
| ----------------------------- | --------------------- | -------------------------------------- |
| `CustomerGateway`             | Orders → Customers    | Customer lookup for checkout           |
| `CartGateway`                 | Orders → Carts        | Cart retrieval and clearing            |
| `InventoryReservationGateway` | Orders → Inventory    | Stock reservation/release/confirmation |
| `PaymentGateway`              | Orders → Payments     | Payment processing                     |
| `ProductGateway`              | Carts → Products      | Product validation for cart items      |
| `InventoryGateway`            | Carts → Inventory     | Stock availability checks              |
| `CustomerGateway`             | Auth → Customers      | Customer creation on registration      |

### Microservice Migration

| Monolith                                       | Microservice                                    |
| ---------------------------------------------- | ----------------------------------------------- |
| ACL adapter injects upstream Use Case directly | ACL adapter calls upstream via HTTP/gRPC client |
| In-process, synchronous                        | Network call, synchronous (or async w/ timeout) |
| Swap adapter implementation only               | Port contract stays **identical** ✅            |

---

## Pattern 3: Saga / Process Manager

> **Purpose**: Orchestrate a **multi-step workflow** across multiple Bounded Contexts where each step may need **compensation** (rollback) if a later step fails.

> _"A Saga is a sequence of local transactions. Each local transaction updates the database and publishes a message or event to trigger the next local transaction in the saga."_
> — Richardson, _Microservices Patterns_ (2018), Ch. 4

### When to Use

- ✅ A business process spans **multiple contexts** with **multiple steps**
- ✅ Steps must execute **in order** and later failures must **undo earlier steps**
- ❌ Not for single-step cross-context reactions (use Domain Events)
- ❌ Not for queries (use ACL Gateway)

### This Project — Implemented ✅ (Checkout Flow)

The checkout SAGA orchestrates across Orders, Inventory, Payments, and Carts:

```
Online Flow:  Validate Cart → Reserve Stock → Process Payment → Confirm Order → Clear Cart
COD Flow:     Validate Cart → Reserve Stock → [WAIT] → Manual Confirm → Clear Cart

Compensation: Release Stock → Refund Payment (if paid) → Cancel Order
```

The `CheckoutFailureListener` monitors BullMQ job failures and triggers compensation automatically.

### Microservice Migration

| Monolith                                     | Microservice                                       |
| -------------------------------------------- | -------------------------------------------------- |
| In-process orchestrator with BullMQ steps    | Orchestrator + message broker (Kafka/RabbitMQ)     |
| Compensation via direct use case calls       | Compensation via compensating commands over broker |
| Pattern is **inherently microservice-ready** | ✅                                                 |

---

## Pattern 4: Domain Events

> **Purpose**: Announce that **something significant happened** in your context. Other contexts react autonomously. The publisher has **zero knowledge** of who subscribes.

> **Status**: 🔜 Not yet implemented — documented for future reference.

### When to Use

- ✅ A change in Context A should trigger a **reaction** in Context B
- ✅ The publisher does **NOT need the result**
- ✅ Multiple contexts may need to react to the same event
- ❌ Not for request-response flows (use ACL Gateway)
- ❌ Not for within-context deferred work (use Job Scheduler)

### Planned Events

| Event              | Publisher | Potential Subscribers               |
| ------------------ | --------- | ----------------------------------- |
| `OrderConfirmed`   | Orders    | Notifications, Inventory (finalize) |
| `PaymentCompleted` | Payments  | Orders (update status)              |
| `StockReserved`    | Inventory | Orders (proceed to payment)         |

### Microservice Migration

| Monolith                                       | Microservice                           |
| ---------------------------------------------- | -------------------------------------- |
| NestJS `@nestjs/event-emitter` (EventEmitter2) | Kafka topic / RabbitMQ exchange        |
| In-process, non-persistent                     | Persistent, distributed                |
| Medium migration — need broker setup           | Port abstraction eases adapter swap ✅ |

---

## Pattern 5: Transactional Outbox

> **Purpose**: Guarantee that **domain events are published reliably** after a database transaction commits.

> **Status**: 📋 Not yet implemented — documented for future reference.

### When to Use

- ✅ Domain Events must be **guaranteed delivered** (financial, compliance-critical)
- ✅ You cannot tolerate **lost events** between DB commit and event publish
- ❌ Overkill for non-critical side effects where re-triggering is acceptable

### Architecture

```
UseCase:
  1. BEGIN transaction
  2. UPDATE aggregate in business table
  3. INSERT event into outbox table
  4. COMMIT transaction

Outbox Relay (background BullMQ worker):
  1. Poll outbox table for unsent events
  2. Publish to event bus
  3. Mark event as sent
```

### Microservice Migration

| Monolith                                 | Microservice                             |
| ---------------------------------------- | ---------------------------------------- |
| Not needed (EventEmitter2 is in-process) | Outbox table + CDC (Debezium) or polling |
| Simple                                   | Essential for reliability ✅             |

---

## Microservice Migration Summary

All five patterns follow **Ports & Adapters**. The port stays the same; only the adapter swaps:

| Pattern                  | Monolith Adapter          | Microservice Adapter          | Migration Effort |
| ------------------------ | ------------------------- | ----------------------------- | ---------------- |
| **Job Scheduler**        | BullMQ (own queue)        | SQS / own BullMQ instance     | 🟢 Low           |
| **ACL Gateway**          | Direct Use Case injection | HTTP / gRPC client            | 🟢 Low           |
| **Saga**                 | In-process BullMQ steps   | Orchestrator + message broker | 🟡 Medium        |
| **Domain Events**        | NestJS EventEmitter2      | Kafka / RabbitMQ topic        | 🟡 Medium        |
| **Transactional Outbox** | Not needed (in-process)   | Outbox table + CDC relay      | 🔴 High          |

> **Microservice readiness comes from the Port abstraction, not the transport mechanism.** Whether you use BullMQ, Kafka, or HTTP doesn't matter — what matters is that your application core depends on an abstract port, and the adapter is the only component that knows about the transport.

---

## References

- Evans, Eric. _Domain-Driven Design: Tackling Complexity in the Heart of Software_. Addison-Wesley, 2003.
- Vernon, Vaughn. _Implementing Domain-Driven Design_. Addison-Wesley, 2013.
- Cockburn, Alistair. _Hexagonal Architecture_. 2005.
- Richardson, Chris. _Microservices Patterns_. Manning, 2018.
- Millett, Scott & Tune, Nick. _Patterns, Principles, and Practices of Domain-Driven Design_. Wrox, 2015.
