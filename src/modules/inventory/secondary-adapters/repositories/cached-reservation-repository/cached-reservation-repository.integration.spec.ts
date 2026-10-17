import { InventoryCommandTestFactory } from 'src/modules/inventory/testing';
import {
  MockCacheService,
  MockLogger,
  ResultAssertionHelper,
  assertDefined,
} from 'src/testing';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { Inventory } from '../../../core/domain/entities/inventory';
import { Reservation } from '../../../core/domain/entities/reservation';
import { InventoryEntity } from '../../orm/inventory.schema';
import { ReservationEntity } from '../../orm/reservation.schema';
import { CachedInventoryRepository } from '../cached-inventory-repository/cached-inventory-repository';
import { PostgresInventoryRepository } from '../postgres-inventory-repository/postgres-inventory-repository';
import { PostgresReservationRepository } from '../postgres-reservation-repository/postgres.reservation-repository';
import { CachedReservationRepository } from './cached-reservation-repository';

/**
 * Real Postgres delegates with a Map-backed MockCacheService, so a cached read
 * returns whatever the previous read or write left in the cache.
 * Seeded inventory: available 50, reserved 5.
 */
describe('CachedReservationRepository (Integration - Real DB delegate)', () => {
  let inventoryRepository: CachedInventoryRepository;
  let postgresReservations: PostgresReservationRepository;
  let reservationRepository: CachedReservationRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const store = new Map<string, unknown>();
    const cacheService = new MockCacheService();
    cacheService.get.mockImplementation((key) =>
      Promise.resolve(store.get(key) ?? null),
    );
    cacheService.getMany.mockImplementation((keys) =>
      Promise.resolve(keys.map((key) => store.get(key) ?? null)),
    );
    cacheService.set.mockImplementation((key, value) => {
      store.set(key, value);
      return Promise.resolve(true);
    });
    cacheService.delete.mockImplementation((key) => {
      store.delete(key);
      return Promise.resolve();
    });

    const dataSource = IntegrationTestHelper.getDataSource();
    inventoryRepository = new CachedInventoryRepository(
      cacheService,
      new PostgresInventoryRepository(
        dataSource.getRepository(InventoryEntity),
        dataSource,
      ),
    );
    postgresReservations = new PostgresReservationRepository(
      dataSource.getRepository(ReservationEntity),
      dataSource,
    );
    reservationRepository = new CachedReservationRepository(
      cacheService,
      postgresReservations,
      new MockLogger(),
    );
  });

  const readCachedInventory = async (): Promise<Inventory> => {
    const result = await inventoryRepository.findByProductId(
      seededData.product.id,
    );
    ResultAssertionHelper.assertResultSuccess(result);
    return result.value;
  };

  const reserve = async (
    orderId: number,
    quantity: number,
  ): Promise<Reservation> => {
    const result = await reservationRepository.save(
      InventoryCommandTestFactory.createReservationForOrder(
        orderId,
        seededData.product.id,
        quantity,
      ),
    );
    ResultAssertionHelper.assertResultSuccess(result);
    return result.value;
  };

  const loadReservation = async (reservationId: number | null) => {
    assertDefined(reservationId);
    const result = await reservationRepository.findById(reservationId);
    ResultAssertionHelper.assertResultSuccess(result);
    return result.value;
  };

  it('serves stale stock when a reservation bypasses the decorator', async () => {
    expect((await readCachedInventory()).availableQuantity).toBe(50);

    const result = await postgresReservations.save(
      InventoryCommandTestFactory.createReservationForOrder(
        1,
        seededData.product.id,
        2,
      ),
    );
    ResultAssertionHelper.assertResultSuccess(result);

    expect((await readCachedInventory()).availableQuantity).toBe(50);
  });

  it('save: a cached read after reserving shows the reduced stock', async () => {
    expect((await readCachedInventory()).availableQuantity).toBe(50);

    await reserve(2, 2);

    const inventory = await readCachedInventory();
    expect(inventory.availableQuantity).toBe(48);
    expect(inventory.reservedQuantity).toBe(7);
  });

  it('release: a cached read after releasing shows the restored stock', async () => {
    const reservation = await loadReservation((await reserve(3, 3)).id);
    expect((await readCachedInventory()).availableQuantity).toBe(47);

    ResultAssertionHelper.assertResultSuccess(reservation.release());
    const result = await reservationRepository.release(reservation);
    ResultAssertionHelper.assertResultSuccess(result);

    const inventory = await readCachedInventory();
    expect(inventory.availableQuantity).toBe(50);
    expect(inventory.reservedQuantity).toBe(5);
  });

  it('confirm: a cached read after confirming shows the consumed reservation', async () => {
    const reservation = await loadReservation((await reserve(4, 3)).id);
    expect((await readCachedInventory()).reservedQuantity).toBe(8);

    ResultAssertionHelper.assertResultSuccess(reservation.confirm());
    const result = await reservationRepository.confirm(reservation);
    ResultAssertionHelper.assertResultSuccess(result);

    const inventory = await readCachedInventory();
    expect(inventory.availableQuantity).toBe(47);
    expect(inventory.reservedQuantity).toBe(5);
  });

  it('expire: a cached read after expiring shows the returned stock', async () => {
    const reservationId = (await reserve(5, 3)).id;
    assertDefined(reservationId);
    await IntegrationTestHelper.getRepository(ReservationEntity).update(
      { id: reservationId },
      { expiresAt: new Date(Date.now() - 60000) },
    );
    const reservation = await loadReservation(reservationId);
    expect((await readCachedInventory()).availableQuantity).toBe(47);

    ResultAssertionHelper.assertResultSuccess(reservation.expire());
    const result = await reservationRepository.expire(reservation);
    ResultAssertionHelper.assertResultSuccess(result);

    const inventory = await readCachedInventory();
    expect(inventory.availableQuantity).toBe(50);
    expect(inventory.reservedQuantity).toBe(5);
  });
});
