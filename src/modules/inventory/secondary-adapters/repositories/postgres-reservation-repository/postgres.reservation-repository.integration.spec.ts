import { InventoryCommandTestFactory } from 'src/modules/inventory/testing';
import { PostgresReservationRepository } from './postgres.reservation-repository';
import { ReservationEntity } from '../../orm/reservation.schema';
import { InventoryEntity } from '../../orm/inventory.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { seedSingleUnitInventory } from 'test/integration/harness/inventory-seed.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';
import { ReservationStatus } from '../../../core/domain/value-objects/reservation-status';

/**
 * Pre-flight (concurrency proof):
 * - PostgresReservationRepository.save() calls dataSource.transaction('REPEATABLE READ', ...)
 * - Inventory rows locked with pessimistic_write (SELECT ... FOR UPDATE)
 * - Integration DataSource uses default TypeORM pool (no max: 1) - concurrent saves use independent transactions
 * - Jest maxWorkers: 1 serializes files, not in-spec Promise.all parallelism
 */
describe('PostgresReservationRepository (Integration - Real DB)', () => {
  let repository: PostgresReservationRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresReservationRepository(
      dataSource.getRepository(ReservationEntity),
      dataSource,
    );
  });

  describe('save', () => {
    it('persists reservation and decrements available inventory', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        1,
        seededData.product.id,
        2,
      );

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.orderId).toBe(1);
      expect(result.value.items[0].productId).toBe(seededData.product.id);

      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });

      expect(inventory!.availableQuantity).toBe(48);
      expect(inventory!.reservedQuantity).toBe(7);

      const reservationCount =
        await IntegrationTestHelper.getRepository(ReservationEntity).count();
      expect(reservationCount).toBe(1);
    });

    it('returns failure when stock is insufficient without mutating inventory', async () => {
      const inventoryRepo =
        IntegrationTestHelper.getRepository(InventoryEntity);
      await inventoryRepo.update(
        { productId: seededData.product.id },
        { availableQuantity: 0, reservedQuantity: 5 },
      );

      const dto = InventoryCommandTestFactory.createReservationForOrder(
        2,
        seededData.product.id,
        1,
      );

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Insufficient stock');

      const inventory = await inventoryRepo.findOneBy({
        productId: seededData.product.id,
      });
      expect(inventory!.availableQuantity).toBe(0);
      expect(inventory!.reservedQuantity).toBe(5);
    });

    it('returns failure when inventory row does not exist', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        3,
        99999,
        1,
      );

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Inventory not found');
    });
  });

  describe('findById / findByOrderId', () => {
    it('round-trips persisted reservation through mapper', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        10,
        seededData.product.id,
        1,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      const byId = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(byId);
      expect(byId.value.orderId).toBe(10);

      const byOrderId = await repository.findByOrderId(10);
      ResultAssertionHelper.assertResultSuccess(byOrderId);
      expect(byOrderId.value.id).toBe(saveResult.value.id);
    });
  });

  describe('release', () => {
    it('restores available stock and updates reservation status', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        20,
        seededData.product.id,
        3,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      const loaded = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(loaded);
      loaded.value.release();

      const releaseResult = await repository.release(loaded.value);
      ResultAssertionHelper.assertResultSuccess(releaseResult);

      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(50);
      expect(inventory!.reservedQuantity).toBe(5);
    });

    it('releasing a CONFIRMED reservation restocks available quantity without double-decrementing reserved quantity', async () => {
      // Seeded: available 50, reserved 5.
      // 1. Reserve 3 -> available 47, reserved 8.
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        21,
        seededData.product.id,
        3,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      const loadedForConfirm = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(loadedForConfirm);
      ResultAssertionHelper.assertResultSuccess(
        loadedForConfirm.value.confirm(),
      );

      // 2. Confirm 3 -> available 47, reserved 5.
      const confirmResult = await repository.confirm(loadedForConfirm.value);
      ResultAssertionHelper.assertResultSuccess(confirmResult);

      let inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(47);
      expect(inventory!.reservedQuantity).toBe(5);

      // 3. Release CONFIRMED reservation (e.g. order cancel) -> should end at available 50, reserved 5
      const loadedForRelease = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(loadedForRelease);
      ResultAssertionHelper.assertResultSuccess(
        loadedForRelease.value.release(),
      );

      const releaseResult = await repository.release(loadedForRelease.value);
      ResultAssertionHelper.assertResultSuccess(releaseResult);

      inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(50);
      expect(inventory!.reservedQuantity).toBe(5);
    });
  });

  describe('confirm', () => {
    it('consumes reserved stock without changing available quantity', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        30,
        seededData.product.id,
        3,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      const loaded = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(loaded);
      ResultAssertionHelper.assertResultSuccess(loaded.value.confirm());

      const confirmResult = await repository.confirm(loaded.value);
      ResultAssertionHelper.assertResultSuccess(confirmResult);

      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(47);
      expect(inventory!.reservedQuantity).toBe(5);
    });

    it('fails when confirming a RELEASED reservation and does not mutate inventory', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        31,
        seededData.product.id,
        3,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      const loaded = await repository.findById(saveResult.value.id!);
      ResultAssertionHelper.assertResultSuccess(loaded);
      ResultAssertionHelper.assertResultSuccess(loaded.value.release());

      const releaseResult = await repository.release(loaded.value);
      ResultAssertionHelper.assertResultSuccess(releaseResult);

      // Stale attempt to confirm released reservation
      const confirmResult = await repository.confirm(loaded.value);
      ResultAssertionHelper.assertResultFailure(
        confirmResult,
        'Cannot confirm reservation in RELEASED status',
      );

      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(50);
      expect(inventory!.reservedQuantity).toBe(5);
    });
  });

  describe('check constraints', () => {
    it('rejects negative availableQuantity at the database level', async () => {
      const inventoryRepo =
        IntegrationTestHelper.getRepository(InventoryEntity);
      await expect(
        inventoryRepo.update(
          { productId: seededData.product.id },
          { availableQuantity: -1 },
        ),
      ).rejects.toThrow();
    });

    it('rejects negative reservedQuantity at the database level', async () => {
      const inventoryRepo =
        IntegrationTestHelper.getRepository(InventoryEntity);
      await expect(
        inventoryRepo.update(
          { productId: seededData.product.id },
          { reservedQuantity: -1 },
        ),
      ).rejects.toThrow();
    });
  });

  describe('expire and findPendingExpired', () => {
    it('expires a stale PENDING reservation and returns its stock to available', async () => {
      // 1. Reserve 3 -> available 47, reserved 8
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        40,
        seededData.product.id,
        3,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      // Backdate expiresAt to simulate abandoned checkout
      const reservationRepo =
        IntegrationTestHelper.getRepository(ReservationEntity);
      await reservationRepo.update(
        { id: saveResult.value.id! },
        { expiresAt: new Date(Date.now() - 60000) },
      );

      // 2. Query expired reservations with bounded batch
      const now = new Date();
      const expiredResult = await repository.findPendingExpired(now, 10);
      ResultAssertionHelper.assertResultSuccess(expiredResult);
      expect(expiredResult.value.length).toBeGreaterThanOrEqual(1);

      const toExpire = expiredResult.value.find(
        (r) => r.id === saveResult.value.id,
      );
      expect(toExpire).toBeDefined();

      // 3. Expire the reservation
      ResultAssertionHelper.assertResultSuccess(toExpire!.expire());
      const expireResult = await repository.expire(toExpire!);
      ResultAssertionHelper.assertResultSuccess(expireResult);

      // 4. Verify inventory is returned: available 50, reserved 5
      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(50);
      expect(inventory!.reservedQuantity).toBe(5);

      // 5. Verify DB row is EXPIRED
      const updatedEntity = await reservationRepo.findOneBy({
        id: saveResult.value.id!,
      });
      expect(updatedEntity!.status).toBe(ReservationStatus.EXPIRED);
    });

    it('does not return active (non-expired) reservations in findPendingExpired', async () => {
      const dto = InventoryCommandTestFactory.createReservationForOrder(
        41,
        seededData.product.id,
        2,
      );
      const saveResult = await repository.save(dto);
      ResultAssertionHelper.assertResultSuccess(saveResult);

      // expiresAt is 15 minutes in the future; querying with now should not find it
      const expiredResult = await repository.findPendingExpired(new Date(), 10);
      ResultAssertionHelper.assertResultSuccess(expiredResult);
      const found = expiredResult.value.find(
        (r) => r.id === saveResult.value.id,
      );
      expect(found).toBeUndefined();
    });
  });

  describe('concurrent checkout inventory invariant - repository-level reservation proof', () => {
    it('serializes parallel saves: 1 available unit → exactly 1 reservation succeeds', async () => {
      const dataSource = IntegrationTestHelper.getDataSource();
      await seedSingleUnitInventory(dataSource, seededData.product.id);

      const attempts = 8;
      const inputs = Array.from({ length: attempts }, (_, i) =>
        InventoryCommandTestFactory.createReservationForOrder(
          i + 100,
          seededData.product.id,
          1,
        ),
      );

      const results = await Promise.all(
        inputs.map((dto) => repository.save(dto)),
      );

      const successes = results.filter((r) => r.isSuccess);
      const failures = results.filter((r) => r.isFailure);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(attempts - 1);
      failures.forEach((r) => {
        expect(r.error.message).toMatch(
          /Insufficient stock|Failed to save reservation/i,
        );
      });

      const inventory = await IntegrationTestHelper.getRepository(
        InventoryEntity,
      ).findOneBy({ productId: seededData.product.id });
      expect(inventory!.availableQuantity).toBe(0);
      expect(inventory!.reservedQuantity).toBe(1);

      const reservationCount =
        await IntegrationTestHelper.getRepository(ReservationEntity).count();
      expect(reservationCount).toBe(1);
    });
  });
});
