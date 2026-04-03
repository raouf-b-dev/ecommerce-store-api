# Architecture & Development Guidelines

This project follows **Domain-Driven Design (DDD)** principles and **Hexagonal Architecture** (Ports and Adapters). All changes must strictly adhere to these patterns.

> For strict academic definitions and decision flowcharts, see **[DDD-HEXAGONAL.md](docs/DDD-HEXAGONAL.md)**. For cross-context integration patterns, see **[INTEGRATION-PATTERNS.md](docs/INTEGRATION-PATTERNS.md)**.

## 1. Architectural Layers (Dependencies go Inwards)

### 1.1 Domain Layer (The Core)

**Path:** `src/modules/[module]/core/domain`

- **Dependencies:** ZERO. Must not import from Application, Infrastructure, or Presentation.
- **Contents:**
  - **Models/Entities**: Pure classes encapsulating state and business logic.
  - **Value Objects**: Immutable objects defined by their attributes.
  - **Repository Interfaces**: Contracts defining storage operations.
  - **Domain Events**: Events triggered by domain state changes.
  - **Domain Services**: Logic that doesn't belong to a single entity.
- **Rules:**
  - Never use ORM decorators (TypeORM/Prisma) here.
  - Never use NestJS `@Injectable` or Controller decorators here.
  - **No Repository Injection**: Domain Services receive data (Entities/Aggregates) as arguments. Data fetching is the responsibility of the Application Layer (Use Cases).

### 1.2 Application Layer

**Path:** `src/modules/[module]/core/application`

- **Dependencies:** Domain Layer only.
- **Contents:**
  - **Use Cases**: Specific business actions (e.g., `CheckoutUseCase`). Orchestrates domain objects.
  - **Application Services**: Coordination logic, often wrapping Use Cases or handling cross-cutting application concerns.
  - **Ports/Gateways Interfaces**: Interfaces for external services (e.g., `NotificationGateway`, `PaymentGateway`).
  - **ACL Gateway Interfaces**: Ports for cross-context data access (e.g., `CustomerGateway`, `CartGateway`). These define downstream-specific DTOs so the core never imports upstream entities.
- **Rules:**
  - Must NOT contain business rules (rules belong in Domain).
  - Must NOT depend on specific infrastructure implementations.

### 1.3 Interface Adapters

#### A. Primary Adapters (Driving)

**Path:** `src/modules/[module]/primary-adapters`

- **Dependencies:** Application Layer.
- **Contents:**
  - **Controllers**: HTTP/REST endpoints (NestJS Controllers).
  - **Consumers/Listeners**: Event subscribers, BullMQ job handlers.
  - **DTOs**: Data Transfer Objects for API requests/responses.
- **Rules:**
  - **Direct Use Case Injection**: Controllers MUST inject and call Use Cases directly.
  - **Thin Controllers**: Controllers MUST directly return `this.useCase.execute(...)` without wrapping in try/catch, error handling, or response transformation. Use Cases return `Result<T, Error>` objects, and the global `ResultInterceptor` handles unwrapping.
  - Delegates actual work to Use Cases.

#### B. Secondary Adapters (Driven)

**Path:** `src/modules/[module]/secondary-adapters` (Module-specific) or `src/infrastructure/` (Global)

- **Dependencies:** Domain (Interfaces), Application (Interfaces), External Libraries.
- **Contents:**
  - **Repository Implementations**: Concrete classes implementing Domain Repository Interfaces.
  - **Gateway Implementations**: Concrete classes for Application Gateway ports.
  - **ORM Entities/Schemas**: Database-specific representations (TypeORM `@Entity`).
  - **Mappers**: Translators between DB Entities/DTOs and Domain Models.
  - This is the ONLY place where external libraries (TypeORM, Redis client, etc.) should be imported.

#### C. Mapper Standards

When creating Mappers to convert Domain Entities to ORM Entities, follow this pattern:

1. **Use `CreateFromEntity` Utility**: Define a type alias using `CreateFromEntity<TEntity>` to ensure all required properties are provided.
2. **Use `toPrimitives()`**: Extract primitives from the domain entity.
3. **Use `Object.assign()`**: Assign the strictly typed payload to the entity instance.

```typescript
import { CreateFromEntity } from 'src/infrastructure/mappers/utils/create-from-entity.type';

type MyEntityCreate = CreateFromEntity<MyEntity>;

export class MyMapper {
  static toDomain(entity: MyEntity): MyDomain {
    const props = {
      /* extract props */
    };
    return MyDomain.fromPrimitives(props);
  }

  static toEntity(domain: MyDomain): MyEntity {
    const primitives = domain.toPrimitives();
    const payload: MyEntityCreate = {
      id: primitives.id,
      name: primitives.name,
      // ... all other required props
    };
    return Object.assign(new MyEntity(), payload);
  }

  static toDomainArray(entities: MyEntity[]): MyDomain[] {
    return entities.map((entity) => MyMapper.toDomain(entity));
  }

  static toEntityArray(domains: MyDomain[]): MyEntity[] {
    return domains.map((domain) => MyMapper.toEntity(domain));
  }
}
```

## 2. Directory Structure

```
src/
├── shared-kernel/          # True DDD Shared Kernel — pure domain building blocks
│   └── domain/             # Result, AppError, UseCase, Money, Quantity, IdempotencyStore
│
├── infrastructure/         # Global Secondary Adapters (driven side)
│   ├── database/           # TypeORM connection config
│   ├── redis/              # Redis Stack (RedisJSON, RediSearch, Cache)
│   ├── queue/              # BullMQ queue config, FlowProducer
│   ├── jobs/               # Base job handler, retry policies
│   ├── idempotency/        # Idempotency service (Redis-backed)
│   ├── interceptors/       # Idempotency interceptor
│   ├── decorators/         # @Idempotent() decorator
│   ├── mappers/            # Shared mapper utilities
│   ├── websocket/          # WebSocket gateway, Redis IO adapter
│   └── infrastructure.module.ts
│
├── interceptors/           # Global Result Interceptor (app-level primary adapter)
│
├── modules/                # Feature Modules (Bounded Contexts)
│   ├── [module]/
│   │   ├── core/
│   │   │   ├── domain/     # Models, Value Objects, Repository Interfaces
│   │   │   └── application/ # Use Cases, Services, Ports (incl. ACL Gateways)
│   │   ├── primary-adapters/
│   │   │   ├── dtos/       # Request/Response DTOs
│   │   │   ├── jobs/       # BullMQ job handlers
│   │   │   └── listeners/  # Event listeners
│   │   ├── secondary-adapters/
│   │   │   ├── repositories/  # PostgreSQL & Redis implementations
│   │   │   ├── persistence/   # ORM mappers
│   │   │   ├── gateways/      # ACL Gateway adapters
│   │   │   └── schedulers/    # BullMQ scheduler implementations
│   │   ├── testing/         # Module-specific mocks & factories
│   │   └── [module].module.ts
│
├── config/                  # Global configuration & environment validation
├── testing/                 # Root-level testing utilities & E2E setup
└── main.ts                  # Application bootstrap
```

## 3. General Rules

1. **Dependency Inversion**: High-level modules (Domain/Application) must not depend on low-level modules (Infrastructure). Both should depend on abstractions (Interfaces).
2. **Explicit Boundaries**: Modules communicate via ACL Gateway ports or Domain Events, not by importing each other's infrastructure classes directly.
3. **Use Cases as Entry Points**: All business operations go through a Use Case. Controllers inject Use Cases directly — no intermediate controller classes.
4. **Thin Controller Pattern**: Controllers directly return the Use Case execution result:

   **Correct:**

   ```typescript
   @Get('list')
   async findAll(@Query() query: SearchDTO) {
     return this.getItemsUseCase.execute(query);
   }
   ```

   **Incorrect:**

   ```typescript
   @Get('list')
   async findAll(@Query() query: SearchDTO) {
     const result = await this.getItemsUseCase.execute(query);
     if (result.isFailure) {
       return ErrorFactory.ControllerError(...); // ❌ Error handling in controller
     }
     return Result.success(result.value.map(...)); // ❌ Transformation in controller
   }
   ```

5. **ACL Gateways for Cross-Context Data**: When a module needs data from another module, it MUST go through an ACL Gateway (port in `core/application/ports/`, adapter in `secondary-adapters/gateways/`). Direct repository or entity imports from other modules are forbidden in application core.
6. **Cross-Context Use Case Ownership**: If a use case mutates entities from multiple contexts, it belongs in the **Core Domain** that owns the primary workflow. Supporting Subdomains are _called_, never _call back_.

## 4. Notifications & Real-Time Events

### 4.1 When to Use Which

| Scenario                                                 | Use Notification | Use Socket Event |
| :------------------------------------------------------- | :--------------: | :--------------: |
| **Requires user action** (e.g., order update)            |        ✅        |        ❌        |
| **Must be persistent** (viewable in notification center) |        ✅        |        ❌        |
| **Real-time UI sync** (e.g., order status changed)       |        ❌        |        ✅        |
| **Ephemeral updates** (e.g., user online/offline)        |        ❌        |        ✅        |

### 4.2 Notifications

- **Always use `NotificationScheduler`** to send notifications from Use Cases.
- **Never call** `DeliverNotificationService` or `NotificationGateway` directly.
- This ensures asynchronous delivery via BullMQ with automatic retry.

```typescript
// ✅ Correct
await this.notificationScheduler.scheduleNotification(notification);

// ❌ Incorrect
await this.deliverNotificationService.execute({ notification }); // Blocking
await this.notificationGateway.send(notification); // Direct call
```

### 4.3 Real-Time Socket Events

- Use `SocketEventEmitter` abstract class for emitting WebSocket events.
- Methods: `emit()`, `emitToUser()`, `emitToRole()`
- Inject the abstract class, not the concrete implementation.

## 5. Background Jobs & Scheduling

### 5.1 Key Conventions

- **Job names**: kebab-case, prefixed with action (e.g., `process-checkout`, `deliver-notification`)
- **Process files**: Named `[action].process.ts`
- **Scheduler files**: Named `bullmq.[module]-scheduler.ts`
- **All job handlers** must extend `BaseJobHandler<TData, TResult>`
- **Cron triggers** go in the scheduler implementation, not the processor
- **Use `JobConfigService`** to get standardized job options with retry policies

### 5.2 Creating a New Scheduled Job

1. Add job name to `src/infrastructure/jobs/job-names.ts`
2. Add retry policy to `src/infrastructure/jobs/job-retry-policies.ts`
3. Create scheduler port (if module doesn't have one) in `core/application/ports/`
4. Create BullMQ scheduler adapter in `secondary-adapters/schedulers/`
5. Create job handler extending `BaseJobHandler` in `primary-adapters/jobs/`
6. Create or update processor (WorkerHost) routing jobs to handlers
7. Register in module providers

## 6. Testing Conventions

- **Unit tests** are co-located with source files (`usecase.spec.ts` next to `usecase.ts`)
- **Test factories** live in `modules/[module]/testing/factories/`
- **Typed mock repositories** live in `modules/[module]/testing/mocks/`
- Factories generate domain objects for specific scenarios (e.g., `OrderTestFactory.createCashOnDeliveryOrder()`)
- Mocks implement the real repository interface with helper methods for test setup

## 7. Redis Infrastructure

### Constants & Schemas

- **Constants**: `src/infrastructure/redis/constants/redis.constants.ts` — Index names, cache keys, flags. Always use these instead of hardcoded strings.
- **Schemas**: `src/infrastructure/redis/constants/redis.schemas.ts` — RediSearch field definitions.
- **Important**: If you add a new searchable field, you MUST update the Schema.

### Index Initialization

The `RedisIndexInitializerService` calculates an MD5 hash of each Schema and compares it against the stored hash in Redis. If the schema changed, the index is dropped and recreated. This ensures production indexes are never dropped unless the schema code explicitly changed.
