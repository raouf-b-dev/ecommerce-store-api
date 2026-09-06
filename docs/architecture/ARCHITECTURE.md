# System Architecture

High-level overview of the ecommerce-store-api architecture, design decisions, and system flows.

## Table of Contents

- [System Context](#system-context-c4-level-1)
- [Strategic Domain-Driven Design](#strategic-domain-driven-design)
- [High-Level Architecture](#high-level-architecture)
- [Component Dependencies](#component-dependencies-c4-level-2)
- [Checkout Sequence Diagram](#checkout-sequence-diagram)
- [SAGA Compensation Flow](#saga-compensation-flow-failure-handling)
- [Key Patterns Implemented](#key-patterns-implemented)
- [Payment Methods (Current Scope)](#payment-methods-current-scope)
- [Payment Event Handling](#payment-event-handling-async)
- [Idempotency Logic](#idempotency-logic)
- [Notification System Architecture](#notification-system-architecture)

## Strategic Domain-Driven Design

Strategic DDD defines boundaries and relationships between parts of the system.

### Subdomains

| Subdomain | Type | Description |
| :-------- | :--- | :---------- |
| **Orders** | **Core Domain** | Order lifecycle, checkout SAGA orchestration, and revenue flows. |
| **Identity** | Supporting | User accounts, profiles, contact info, and shipping addresses. |
| **Authorization** | Supporting | RBAC, permission resolution, and user role assignments. |
| **Carts** | Supporting | Shopping sessions, item selection, and cart persistence (RedisJSON). |
| **Inventory** | Supporting | Stock levels and reservations. |
| **Products** | Supporting | Catalog, categories, and search indexing. |
| **Payments** | Generic | Payment intents and gateway abstraction. Provider adapter is a mock today. |
| **Authentication** | Generic | Credentials, password hashing, sessions, and JWT management. |
| **Notifications** | Generic | Real-time and background alerts. |
| **Analytics** | Supporting | Admin ops reporting / query composition (revenue, series, top products, stock alerts). No write aggregates; see [domains/ANALYTICS.md](domains/ANALYTICS.md). |
| **Health** | Generic | Liveness and readiness probes (process, PostgreSQL; Redis reported on `/health`). |

### Bounded Contexts and Context Mapping

Each NestJS module under `src/modules/` is treated as a context. Health is an ops module (probes). Analytics is a query-only composition module, not a write aggregate. Context mapping keeps write-side boundaries explicit and avoids a tangled dependency graph.

```mermaid
graph TD
 SK[Shared Kernel] --> Orders[Orders Core Domain]
 SK --> Carts[Carts]
 SK --> Inventory[Inventory]
 SK --> Products[Products]
 SK --> Identity[Identity]
 SK --> Authorization[Authorization]
 SK --> Payments[Payments]
 SK --> Authentication[Authentication]
 SK --> Notifications[Notifications]
 SK --> Analytics[Analytics]
 SK --> Health[Health]

 subgraph ACL_Orders["ACL Gateways in Orders"]
 CustGW["UserGateway"]
 CartGW["CartGateway"]
 InvGW["InventoryReservationGateway"]
 PayGW["PaymentGateway"]
 end

 Identity -.-|"GetUserUseCase"| CustGW
 Carts -.-|"GetCartUseCase / ClearCartUseCase"| CartGW
 Inventory -.-|"ReserveStockUseCase / ReleaseStockUseCase"| InvGW
 Payments -.-|"ProcessPaymentUseCase"| PayGW

 CustGW -->|"validateUser()"| Orders
 CartGW -->|"getCart() / clearCart()"| Orders
 InvGW -->|"reserve() / release() / confirm()"| Orders
 PayGW -->|"processPayment() / refund()"| Orders

 subgraph ACL_Carts["ACL Gateways in Carts"]
 ProdGW["ProductGateway"]
 InvGW2["InventoryGateway"]
 end

 Products -.-|"GetProductUseCase"| ProdGW
 Inventory -.-|"CheckStockUseCase"| InvGW2

 ProdGW -->|"getProduct()"| Carts
 InvGW2 -->|"checkStock()"| Carts

 Authentication -->|"ACL / IdentityGateway"| Identity
 Authentication -->|"ACL / AuthorizationGateway"| Authorization
 Orders -->|"Event"| Notifications

 Orders -.->|"SQL read composition"| Analytics
 Payments -.->|"SQL read composition"| Analytics
 Inventory -.->|"SQL read composition"| Analytics
 Products -.->|"SQL read composition"| Analytics
```

> **Analytics:** Query-only composition BC. Reads Orders/Payments/Inventory/Products tables via Postgres query adapters: no ACL gateways and no write aggregates. Details: [domains/ANALYTICS.md](domains/ANALYTICS.md).

> **Anti-Corruption Layer (ACL):** Downstream contexts define their own ports (gateway interfaces) with only the data they need. Adapters in the secondary layer translate upstream models into the downstream domain language. If Identity changes its user entity, only the Orders `ModuleUserGateway` adapter needs updating, not Orders use cases.

Health has no ACL consumers. It exposes HTTP probes only.

## System Context (C4 Level 1)

How the API sits in the local landscape:

```mermaid
flowchart LR
    Customer["Customer"] -->|HTTPS/WSS| API["E-commerce API"]
    API -->|"TCP"| Postgres["PostgreSQL"]
    API -->|"TCP"| Redis["Redis Stack"]
    API -->|"HTTPS gateway port mock today"| PayGw["Payment Gateway"]
```

The payment gateway edge is a port with a mock adapter today. A real provider can replace the adapter without changing Orders or the checkout SAGA shape.

## High-Level Architecture

Modular monolith on NestJS. PostgreSQL is the primary store. Redis Stack handles caching, cart documents, search, and BullMQ.

```mermaid
graph TD
 Client["Client App"] -->|HTTP/REST| API["NestJS API"]
 Client -->|WebSocket| WS["WebSocket Gateway"]

 subgraph AppCore["Application Core"]
 API --> Authentication["Authentication"]
 API --> Authorization["Authorization"]
 API --> Orders["Orders"]
 API --> Products["Products"]
 API --> Carts["Carts"]
 API --> Payments["Payments"]
 API --> Inventory["Inventory"]
 API --> Identity["Identity"]
 API --> Health["Health"]
 WS --> Notifications["Notifications"]

 Authentication -->|ACL| Identity
 Authentication -->|ACL| Authorization
 Orders -->|SAGA| Inventory
 Orders -->|SAGA| Payments
 Orders -->|ACL| Identity
 Orders -->|ACL| Carts
 Orders -->|Event| Notifications
 end

 subgraph Infra["Secondary Adapters"]
 Authentication -->|Persist| PG["PostgreSQL"]
 Authorization -->|Persist| PG
 Identity -->|Persist| PG
 Orders -->|Persist| PG
 Products -->|Persist| PG
 Inventory -->|Persist| PG
 Payments -->|Persist| PG
 Carts -->|Cache/Persist| Redis["Redis Stack"]
 Products -->|Search| Redis
 Orders -->|Async Jobs| BullMQ["BullMQ"]
 Notifications -->|Async Jobs| BullMQ
 end

 subgraph External["External"]
 Payments -->|"Gateway port mock today"| PayPort["Payment Gateway"]
 end
```

Checkout SAGA steps: Validate Cart → Reserve Stock → Process Payment (gateway port) → Confirm Order. Payment runs through a mock adapter today. The port is ready for a real provider when you wire one in.

## Component Dependencies (C4 Level 2)

Module dependencies with Orders as orchestrator:

```mermaid
graph TD
 subgraph Orchestration["Orchestration"]
 Orders["Orders"]
 end

 subgraph Domains["Domains"]
 Inventory["Inventory"]
 Payments["Payments"]
 Products["Products"]
 Identity["Identity"]
 Authorization["Authorization"]
 Carts["Carts"]
 end

 subgraph Support["Support"]
 Authentication["Authentication"]
 Notifications["Notifications"]
 Health["Health"]
 end

 Orders -->|ACL| Inventory
 Orders -->|ACL| Payments
 Orders -->|ACL| Identity
 Orders -->|ACL| Carts
 Orders -->|Event| Notifications

 Carts -->|ACL| Inventory
 Carts -->|ACL| Products

 Authentication -->|ACL IdentityGateway| Identity
 Authentication -->|ACL AuthorizationGateway| Authorization
```

Note: `PaymentsModule` imports `AuthenticationModule` so Nest can apply auth guards on payment routes. That is a Nest wiring import, not an ACL gateway between Payments and Authentication.

## Checkout Sequence Diagram

Happy path with SAGA coordination. Payment goes through the gateway port (mock adapter today).

```mermaid
sequenceDiagram
 participant Client
 participant CheckoutUC as CheckoutUseCase
 participant OrderRepo as Order Repository
 participant BullMQ as Job Queue
 participant Worker as Background Worker
 participant Inventory as Inventory Module
 participant Payment as Payment Module

 Client->>CheckoutUC: POST /checkout
 CheckoutUC->>CheckoutUC: Validate User and Cart
 CheckoutUC->>OrderRepo: Create Order PENDING_PAYMENT
 CheckoutUC->>BullMQ: Schedule SAGA Checkout Process
 CheckoutUC-->>Client: 201 Created

 rect rgba(0, 255, 0, 0.1)
 Note over Worker,Inventory: Async Phase 1: Stock Reservation
 BullMQ->>Worker: Process Job
 Worker->>Inventory: Reserve Stock
 Inventory-->>Worker: Stock Reserved
 end

 rect rgba(0, 0, 255, 0.1)
 Note over Worker,Payment: Async Phase 2: Payment via Gateway
 Worker->>Payment: Process payment via gateway
 Payment-->>Worker: Payment Authorized and Captured
 end

 Worker->>OrderRepo: Update Order Status CONFIRMED
 Worker-->>BullMQ: Job Completed
```

## SAGA Compensation Flow (Failure Handling)

If a checkout step fails (stock unavailable, payment declined, and so on), `CheckoutFailureListener` runs compensation.

```mermaid
sequenceDiagram
 participant Job as Checkout Job
 participant Listener as CheckoutFailureListener
 participant Payment as Payment Module
 participant Order as Order Module
 participant Inventory as Inventory Module

 Note over Job: Checkout Job Fails
 Job->>Listener: Emits checkout.saga.failed

 Listener->>Listener: Analyze Failure Step

 par Compensation Steps
 Listener->>Payment: Process Refund if paid
 Listener->>Order: Cancel Order Entity
 Listener->>Inventory: Release Stock Reservation
 end

 Listener-->>Listener: Log Compensation Success
```

<a id="key-patterns-implemented"></a>

## Key Patterns Implemented

### 1. Domain-Driven Design (DDD)

- Rich domain models: business rules live in entities (`Cart`, `Order`, `Product`).
- Value objects: `Money`, `Address`, `PaymentMethod`, and similar.
- Repositories: interfaces in domain, implementations in secondary adapters.

### 2. Result Pattern

Use cases return `Result<T, E>` instead of throwing for business outcomes. Errors stay explicit and typed.

### 3. Idempotency

Checkout is protected by `@Idempotent()` with a Redis store so retries do not duplicate side effects.

### 4. Background Processing

Multi-step workflows run on BullMQ so HTTP stays fast and work can retry safely.

## Checkout Execution and SAGA Compensation Flow

```mermaid
flowchart TD
 Start((Start)) --> Validate[Validate Cart and Authenticated User]
 Validate --> CreateOrder[Create Order PENDING_PAYMENT]
 CreateOrder --> Schedule[Schedule Checkout SAGA Job]
 Schedule --> ReturnClient[Return 201 Checkout Initiated]

 Schedule -.-> Worker[BullMQ Worker Processing]
 Worker --> ValidateCart[Validate Cart State]
 ValidateCart -->|Fail| FailSAGA[Trigger Compensation SAGA]
 ValidateCart --> ReserveStock[Reserve Stock]

 ReserveStock -->|Fail| FailSAGA
 ReserveStock --> ProcessPayment[Process payment via gateway]

 ProcessPayment -->|Fail| FailSAGA
 ProcessPayment --> PaymentSuccess{Success?}
 PaymentSuccess -- Yes --> ConfirmOrder[Update Order Status CONFIRMED]
 PaymentSuccess -- No --> FailSAGA

 ConfirmOrder --> ConfirmRes[Confirm Stock Reservation]
 ConfirmRes --> ClearCart[Clear User Cart]
 ClearCart --> Finalize[Finalize Order and Emit Event]

 FailSAGA --> Refund["Refund payment if paid"]
 Refund --> ReleaseStock["Release Stock if Reserved"]
 ReleaseStock --> CancelOrder[Update Status CANCELLED]
```

## Payment Methods (Current Scope)

`PaymentMethodType` currently includes **Stripe only**. The Stripe gateway adapter is a **mock** suitable for local and CI checkout proofs. A real provider SDK is not wired yet.

## Payment Event Handling (Async)

Orders can react to payment-completed jobs on the payment-events queue.

```mermaid
sequenceDiagram
 participant Queue as Payment Events Queue
 participant Processor as PaymentEventsProcessor
 participant Step as PaymentCompletedStep
 participant UseCase as HandlePaymentCompletedUC
 participant OrderRepo as OrderRepository

 Queue->>Processor: Process Job PAYMENT_COMPLETED
 Processor->>Step: Execute Step
 Step->>UseCase: Execute UseCase
 UseCase->>OrderRepo: Find Order
 UseCase->>OrderRepo: Update Status PAID
 UseCase-->>Step: Success
 Step-->>Processor: Job Completed
```

Webhook signature verification for a live Stripe account is stubbed. Do not treat production webhook security as complete until a real verifier is implemented.

## Idempotency Logic

```mermaid
flowchart TD
 Request[Incoming Request] --> Interceptor{Idempotency Interceptor}
 Interceptor -->|Key Exists?| CheckRedis[Check Redis Store]

 CheckRedis -->|Found Result| ReturnCached[Return Cached Response]
 CheckRedis -->|Found In Progress| ThrowConflict[Throw 409 Conflict]
 CheckRedis -->|Not Found| Lock[Lock Key in Redis]

 Lock --> Controller[Execute Controller Logic]
 Controller --> Store[Store Result in Redis]
 Store --> Response[Return Response]
```

## Notification System Architecture

Notifications use a nested BullMQ flow: Save → Send → Update, so delivery and persistence stay ordered.

### Module Structure (Hexagonal Architecture)

```mermaid
graph TD
 subgraph Primary["Primary Adapters"]
 NC[NotificationsController]
 NP[NotificationsProcessor]
 end

 subgraph Application["Core Application"]
 DNS[DeliverNotificationService]
 GUC[GetNotificationsUseCase]
 MUC[MarkAsReadUseCase]
 end

 subgraph Domain["Core Domain"]
 NE[Notification Entity]
 RI[NotificationRepository Interface]
 SI[NotificationScheduler Interface]
 end

 subgraph Secondary["Secondary Adapters"]
 PR[PostgresNotificationRepository]
 BS[BullMqNotificationScheduler]
 WG[WebsocketGateway]
 end

 NC --> GUC
 NC --> MUC
 NP --> DNS

 GUC --> RI
 MUC --> RI

 DNS --> WG
 DNS --> NE

 BS -- implements --> SI
 PR -- implements --> RI

 BS --> NE
```

### Reliable Delivery Flow (BullMQ Nested Flow)

```mermaid
sequenceDiagram
 participant System as Trigger
 participant Scheduler as NotificationScheduler
 participant Queue as BullMQ Flow
 participant Worker as NotificationProcessor
 participant DB as PostgreSQL
 participant WS as WebSocketGateway
 participant Client

 System->>Scheduler: Schedule Notification
 Scheduler->>Queue: Add Flow Save then Send then Update

 Note over Queue, Worker: Step 1 Persistence
 Queue->>Worker: Job SAVE_NOTIFICATION_HISTORY
 Worker->>DB: INSERT Notification PENDING
 DB-->>Worker: Success

 Note over Queue, Worker: Step 2 Delivery
 Queue->>Worker: Job SEND_NOTIFICATION
 Worker->>WS: Send to User Room
 WS-->>Client: Emit notification Event
 Worker-->>Queue: Success

 Note over Queue, Worker: Step 3 Status Update
 Queue->>Worker: Job UPDATE_NOTIFICATION_STATUS
 Worker->>DB: UPDATE Status SENT
```
