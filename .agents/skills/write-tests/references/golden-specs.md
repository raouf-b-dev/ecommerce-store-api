# Golden specs

Each example compiles under `npm run typecheck`, passes under Jest, and is clean under `npm run lint:check`. Copy the shape, rename the subject. Real specs to read next to each one are named in the heading.

## Typed stub without a cast

Create the stub first, type each function with `jest.MockedFunction<T['method']>`, and hand the same reference to `useValue`. Nothing is read back through `module.get`, which returns whatever type you ask for (an unchecked cast in effect), and `mockResolvedValue` is checked against the real return type.

```typescript
const execute: jest.MockedFunction<GetOrderUseCase['execute']> = jest.fn();
const module = await Test.createTestingModule({
  providers: [{ provide: GetOrderUseCase, useValue: { execute } }],
}).compile();

execute.mockResolvedValue(Result.success(order)); // wrong payload type: compile error
```

`satisfies Partial<jest.Mocked<T>>` only checks that the method names exist, not their types: use it for collaborators you never configure, `jest.MockedFunction` for every function whose result you set or assert on.

## Port mock (class implements the port, typed `jest.fn`)

Real: `src/modules/inventory/testing/mocks/inventory-repository.mock.ts`. Put new ones in `modules/<m>/testing/mocks/` and export them from `modules/<m>/testing/index.ts`.

```typescript
export class MockInventoryRepository implements InventoryRepository {
  findById = jest.fn<Promise<Result<Inventory, RepositoryError>>, [number]>();
  save = jest.fn<
    Promise<Result<Inventory, RepositoryError>>,
    [Inventory, number?]
  >();

  mockInventoryNotFound(id: number): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Inventory with id ${id} not found`)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
```

## Use case (`reserve-stock.usecase.spec.ts`)

The mock class from the section above is created in the spec and passed by reference; `module.get` is only used for the subject under test, where the class itself is the lookup key.

```typescript
import { Test } from '@nestjs/testing';
import { ReserveStockUseCase } from './reserve-stock.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';
import {
  InventoryCommandTestFactory,
  MockReservationRepository,
  ReservationRepositoryMockFactory,
  ReservationTestFactory,
} from '../../../../testing';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('ReserveStockUseCase', () => {
  let useCase: ReserveStockUseCase;
  let reservations: MockReservationRepository;

  beforeEach(async () => {
    reservations = ReservationRepositoryMockFactory.createMock();
    const module = await Test.createTestingModule({
      providers: [
        ReserveStockUseCase,
        { provide: POSTGRES_RESERVATION_REPOSITORY, useValue: reservations },
      ],
    }).compile();

    useCase = module.get(ReserveStockUseCase);
  });

  it('returns the saved reservation', async () => {
    const input = InventoryCommandTestFactory.createReservationInput();
    const reservation = ReservationTestFactory.createPendingReservation({
      orderId: input.orderId,
    });
    reservations.mockSuccessfulSave(reservation);

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(reservation);
    expect(reservations.save).toHaveBeenCalledWith(input);
  });

  it('propagates a repository failure', async () => {
    reservations.mockSaveFailure('Database error');

    const result = await useCase.execute(
      InventoryCommandTestFactory.createReservationInput(),
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database error',
      UseCaseError,
    );
  });
});
```

## Controller (`inventory.controller.spec.ts`)

Controllers have many injected use cases: `useMocker` stubs the ones the test does not touch. Always assert the permission metadata of the handler you cover.

```typescript
import { Test } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { GetInventoryUseCase } from './core/application/usecases/get-inventory/get-inventory.usecase';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../../guards/decorators/public.decorator';
import { Result } from '../../shared-kernel/domain/result';

describe('InventoryController', () => {
  let controller: InventoryController;
  let getInventory: jest.MockedFunction<GetInventoryUseCase['execute']>;

  beforeEach(async () => {
    getInventory = jest.fn();
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: GetInventoryUseCase,
          useValue: { execute: getInventory },
        },
      ],
    })
      .useMocker(() => ({ execute: jest.fn() }))
      .compile();

    controller = module.get(InventoryController);
  });

  it('delegates to the use case without extra logic', async () => {
    const found = Result.success(null);
    getInventory.mockResolvedValue(found);

    const result = await controller.getInventory(42);

    expect(getInventory).toHaveBeenCalledWith(42);
    expect(result).toBe(found);
  });

  it('declares its required permission and is not public', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller.getInventory),
    ).toEqual(['view_all_inventory']);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, controller.getInventory),
    ).toBeUndefined();
  });
});
```

## Job handler (`inventory-reconciliation.job.spec.ts`)

`MockCorrelationService` (from `src/testing`) is a typed subclass of the real service. A real BullMQ `Job` needs a queue with `toKey` and `keys`; `Object.assign` adds them to the typed queue mock without a cast.

```typescript
import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { InventoryReconciliationJob } from './inventory-reconciliation.job';
import { ReconcileInventoryUseCase } from '../../core/application/usecases/reconcile-inventory/reconcile-inventory.usecase';
import { MetricsService } from '../../../../infrastructure/metrics/metrics.service';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { MockCorrelationService, createMockQueue } from '../../../../testing';

describe('InventoryReconciliationJob', () => {
  let handler: InventoryReconciliationJob;
  let reconcile: jest.MockedFunction<ReconcileInventoryUseCase['execute']>;
  let incDrift: jest.MockedFunction<
    MetricsService['inventoryDriftCount']['inc']
  >;

  beforeEach(async () => {
    reconcile = jest.fn();
    incDrift = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        InventoryReconciliationJob,
        {
          provide: ReconcileInventoryUseCase,
          useValue: { execute: reconcile },
        },
        {
          provide: MetricsService,
          useValue: { inventoryDriftCount: { inc: incDrift } },
        },
        { provide: CorrelationService, useClass: MockCorrelationService },
      ],
    }).compile();

    handler = module.get(InventoryReconciliationJob);
  });

  it('increments the drift metric once per discrepancy', async () => {
    reconcile.mockResolvedValue(
      Result.success({
        totalChecked: 10,
        discrepancyCount: 1,
        durationMs: 15,
        checkedAt: new Date(),
        discrepancies: [
          { productId: 1, type: 'reservation_drift', expected: 50, actual: 60 },
        ],
      }),
    );
    const queue = Object.assign(createMockQueue(), {
      toKey: jest.fn(),
      keys: {},
    });
    const job = new Job<void>(queue, 'inventory-reconciliation', undefined);

    await handler.handle(job);

    expect(incDrift).toHaveBeenCalledTimes(1);
    expect(incDrift).toHaveBeenCalledWith({ type: 'reservation_drift' });
  });
});
```

## Repository adapter (`postgres-inventory-repository.spec.ts`)

Mock factories only list some methods. Declare what your adapter touches with typed `jest.MockedFunction`s so a typo or signature change fails to compile.

```typescript
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Inventory } from '../../../core/domain/entities/inventory';
import { InventoryEntity } from '../../orm/inventory.schema';
import { PostgresInventoryRepository } from './postgres-inventory-repository';
import {
  InventoryEntityTestFactory,
  InventoryTestFactory,
} from '../../../testing';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  ResultAssertionHelper,
  createMockQueryBuilder,
} from '../../../../../testing';

describe('PostgresInventoryRepository optimistic save', () => {
  let repository: PostgresInventoryRepository;
  let createQueryBuilder: jest.MockedFunction<
    Repository<InventoryEntity>['createQueryBuilder']
  >;
  let findOneByOrFail: jest.MockedFunction<
    Repository<InventoryEntity>['findOneByOrFail']
  >;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<InventoryEntity>>;
  const inventory = Inventory.fromPrimitives(
    InventoryTestFactory.createMockInventory(),
  );

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder<InventoryEntity>();
    createQueryBuilder = jest.fn();
    createQueryBuilder.mockReturnValue(queryBuilder);
    findOneByOrFail = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        PostgresInventoryRepository,
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: { createQueryBuilder, findOneByOrFail },
        },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    repository = module.get(PostgresInventoryRepository);
  });

  it('updates with a version predicate and returns the fresh row', async () => {
    queryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
    findOneByOrFail.mockResolvedValue(
      InventoryEntityTestFactory.createInventoryEntity({ version: 4 }),
    );

    const result = await repository.save(inventory, 3);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'id = :id AND version = :expectedVersion',
      { id: inventory.id, expectedVersion: 3 },
    );
  });

  it('fails with 409 when expectedVersion is stale', async () => {
    queryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });

    const result = await repository.save(inventory, 1);

    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.CONFLICT },
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Optimistic lock failure',
      RepositoryError,
    );
    expect(findOneByOrFail).not.toHaveBeenCalled();
  });
});
```

## Concrete class, no DI

```typescript
const logger = new Logger('spec');
const error = jest.spyOn(logger, 'error').mockImplementation();
```

## Domain entity

No mocks. Follow `src/modules/inventory/core/domain/entities/inventory.spec.ts` and [DOMAIN-ENTITY-TESTING.md](../../../../docs/testing/DOMAIN-ENTITY-TESTING.md).

## Failure injection

For side effects that leave the database (enqueue a job, call a gateway, emit an event). Test that:

1. When the effect fails, earlier state is saved and the error is retryable.
2. When the call is retried, the effect happens exactly once.

```typescript
describe('CancelOrderUseCase when the refund cannot be queued', () => {
  let useCase: CancelOrderUseCase;
  let orders: MockOrderRepository;
  let scheduler: MockOrderScheduler;

  beforeEach(() => {
    orders = new MockOrderRepository();
    scheduler = new MockOrderScheduler();
    scheduler.scheduleOrderStockRelease.mockResolvedValue(
      Result.success('stock-release-job'),
    );
    useCase = new CancelOrderUseCase(orders, scheduler, { publish: jest.fn() });

    const order = OrderTestFactory.createDomainOrder({
      id: 1,
      status: OrderStatus.CONFIRMED,
      paymentId: 42,
    });
    orders.mockSuccessfulFindByIdForUpdate(order);
    orders.mockSuccessfulSave();
    scheduler.failNext(
      new InfrastructureError('queue down', undefined, undefined, true),
    );
  });

  it('saves the cancelled order and returns a retryable failure', async () => {
    const result = await useCase.execute({ orderId: 1 });

    expect(result).toMatchObject({
      isFailure: true,
      error: { retryable: true },
    });
    expect(orders.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.CANCELLED }),
      expect.any(Number),
    );
    expect(scheduler.jobs.size).toBe(0);
  });

  it('creates exactly one refund job when the cancel is retried', async () => {
    await useCase.execute({ orderId: 1 });

    const cancelledOrder = OrderTestFactory.createDomainOrder({
      id: 1,
      status: OrderStatus.CANCELLED,
      paymentId: 42,
    });
    orders.mockSuccessfulFindByIdForUpdate(cancelledOrder);

    const retry = await useCase.execute({ orderId: 1 });
    await useCase.execute({ orderId: 1 });

    ResultAssertionHelper.assertResultSuccess(retry);
    expect(scheduler.scheduleRefundPayment).toHaveBeenCalledTimes(3);
    expect([...scheduler.jobs.keys()]).toEqual(['refund-payment-order-1']);
  });
});
```
