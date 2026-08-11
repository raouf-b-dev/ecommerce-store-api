# Repository & Query Adapter Integration Testing Guide (Real DB)

> **Companion docs**: [`AGENT.md`](../../AGENT.md) (testing standards §9), [`TESTING-TASK-TEMPLATE.md`](TESTING-TASK-TEMPLATE.md) (task checklist), [`DDD-HEXAGONAL.md`](../architecture/DDD-HEXAGONAL.md) (architecture constraints).

This guide details best practices and conventions for writing repository and CQRS query adapter integration tests using a real PostgreSQL instance via **Testcontainers** in the `ecommerce-store-api` codebase.

---

## 1. Architecture & Execution Strategy

Repository and Query Adapter integration tests validate transactional persistence, TypeORM entity mappers, SQL QueryBuilder filters, cross-context JOINs, and database index utilization against a real PostgreSQL database.

### Key Principles

- **Real Database Container**: Tests run against an isolated containerized PostgreSQL instance managed via `@testcontainers/postgresql`.
- **Isolated Suite**: Integration tests use the file pattern `*.integration.spec.ts` and are executed via a dedicated Jest project (`test/integration/jest-integration.json`). Default unit test runs (`npm run test`) explicitly ignore them via `testPathIgnorePatterns: [".*\\.integration\\.spec\\.ts$"]`.
- **Serial Execution**: Standard unit tests remain fast and lightweight without Docker dependencies (`npm run test`). Integration tests run in serial mode (`npm run test:integration`) to ensure total database isolation without connection conflicts.

### Command Execution

```bash
# Run integration test suite (requires Docker runtime)
npm run test:integration

# Target a specific integration spec file
npm run test:integration -- postgres-order-query.adapter
```

---

## 2. Infrastructure & Harness Setup

Integration testing infrastructure is located under `test/integration/`:

```
test/integration/
├── jest-integration.json                    # Dedicated Jest configuration
├── setup/
│   ├── testcontainers.global-setup.ts       # Jest globalSetup — starts Postgres container
│   ├── testcontainers.global-teardown.ts    # Jest globalTeardown — stops Postgres container
│   ├── testcontainers.setup.ts              # Per-file hook — shared DataSource singleton
│   ├── integration-test.constants.ts        # Postgres image version and DB credentials
│   ├── seed-reference-data.ts               # Minimal deterministic FK reference data seeder
│   └── integration-test.helper.ts           # Test helper API (repositories, cleanup, seeding)
└── index-verification.integration.spec.ts   # Index existence & EXPLAIN plan checks
```

### Setup Components

1. **`testcontainers.global-setup.ts`**: Registered in Jest's `globalSetup`. Starts one `PostgreSqlContainer` per test run (180s startup timeout) and writes connection details to `process.env`.
2. **`testcontainers.global-teardown.ts`**: Registered in Jest's `globalTeardown`. Stops the container started by global setup after all integration specs finish.
3. **`testcontainers.setup.ts`**: Registered in Jest's `setupFilesAfterEnv`. Lazily initializes a shared TypeORM `DataSource` (singleton on `global`) from the env vars set by global setup. All spec files reuse the same container and connection pool.
4. **`IntegrationTestHelper`**: Exposes static utility methods:
   - `getDataSource()`: Access the active integration `DataSource`.
   - `getRepository(EntityClass)`: Obtain a TypeORM repository.
   - `clearDatabase()`: Truncates all tables with `CASCADE` resetting identities.
   - `seedReferenceData()`: Seeds minimal reference data (admin/customer users, categories, products, inventory).

---

## 3. Database Isolation & Seeding Conventions

To ensure tests are designed to be deterministic and free of state leakage:

### Standard `beforeEach` Lifecycle Pattern

```typescript
describe('PostgresOrderQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresOrderQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    // 1. Wipe all database tables cleanly
    await IntegrationTestHelper.clearDatabase();

    // 2. Populate minimal deterministic reference data (FK dependencies)
    seededData = await IntegrationTestHelper.seedReferenceData();

    // 3. Instantiate target query adapter with integration DataSource
    const dataSource = IntegrationTestHelper.getDataSource();
    queryAdapter = new PostgresOrderQueryAdapter(dataSource);
  });

  // ... test scenarios
});
```

### Deterministic Seeding Rules

- **Minimal Seeds**: Keep reference seeds minimal. Seed only required FK dependencies (e.g. users, products).
- **No Inline Object Literals**: Use test builders or factories from `src/modules/<module>/testing/` for overrides.
- **No Random Data**: Use fixed, static values for codes, emails, names, and timestamps.
- **Cascade Wipes**: `clearDatabase()` executes `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`, resetting auto-increment IDs for clean test isolation.

---

## 4. Tested Integration Scenarios & Patterns

### A. CQRS Read Projection & Cross-Context JOINs

Verify that query adapters execute SQL QueryBuilders that perform controlled `LEFT JOIN` operations across context boundaries in a single query:

```typescript
it('returns order list item projection with customer name and item count', async () => {
  const result = await queryAdapter.list({ page: 1, limit: 10 });

  expect(result.isSuccess).toBe(true);
  if (!result.isSuccess) return;

  expect(result.value.total).toBe(1);
  expect(result.value.items[0].customerName).toBe('Customer One');
});
```

### B. Ownership Filtering & Security Controls

Validate user ID resource isolation at the query adapter level:

```typescript
it('filters orders strictly by user ID ownership scope', async () => {
  const result = await queryAdapter.list({
    page: 1,
    limit: 10,
    userId: seededData.customerUser.id,
  });

  expect(result.isSuccess).toBe(true);
  if (!result.isSuccess) return;

  expect(
    result.value.items.every((i) => i.userId === seededData.customerUser.id),
  ).toBe(true);
});
```

### C. Index Existence & `EXPLAIN (ANALYZE)` Inspections

Verify that key database indexes exist in `pg_indexes` and query execution plans apply target filter predicates:

```typescript
it('verifies index existence for orders(user_id)', async () => {
  const dataSource = IntegrationTestHelper.getDataSource();
  const indexes = await dataSource.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'orders'",
  );

  const indexNames = indexes.map((i: { indexname: string }) => i.indexname);
  expect(indexNames.some((name) => name.includes('user_id'))).toBe(true);
});
```

---

## 5. Mocking Boundaries Guidance

| Component Layer                  | Integration Test Treatment | Rationale                                                    |
| :------------------------------- | :------------------------- | :----------------------------------------------------------- |
| **PostgreSQL Database**          | **Real Container**         | Core target of repository and query integration testing.     |
| **TypeORM Entities & Mappers**   | **Real Production Code**   | Validates mapping correctness and DB constraints.            |
| **Redis Cache Service**          | **Mocked (`jest.fn()`)**   | Isolates DB transactional behavior; validates wrapper calls. |
| **ACL Gateways / Other Modules** | **Mocked Gateway Ports**   | Maintains modular monolith boundary isolation.               |
| **External Mail/HTTP Services**  | **Mocked Ports**           | Prevents external network side-effects during test runs.     |
