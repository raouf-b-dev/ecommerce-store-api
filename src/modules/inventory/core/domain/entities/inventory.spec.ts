import { InventoryTestFactory } from 'src/modules/inventory/testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Inventory', () => {
  describe('reserveStock', () => {
    it('moves quantity from available to reserved', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 100,
        reservedQuantity: 0,
      });

      ResultAssertionHelper.assertResultSuccess(inventory.reserveStock(20));

      expect(inventory.availableQuantity).toBe(80);
      expect(inventory.reservedQuantity).toBe(20);
    });

    it('rejects when insufficient available stock', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 5,
        reservedQuantity: 0,
      });

      ResultAssertionHelper.assertResultFailure(
        inventory.reserveStock(10),
        'Insufficient stock to reserve',
        DomainError,
      );
    });
  });

  describe('releaseReservation', () => {
    it('moves quantity from reserved back to available', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 80,
        reservedQuantity: 20,
      });

      ResultAssertionHelper.assertResultSuccess(
        inventory.releaseReservation(10),
      );

      expect(inventory.availableQuantity).toBe(90);
      expect(inventory.reservedQuantity).toBe(10);
    });

    it('rejects releasing more than reserved', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 90,
        reservedQuantity: 10,
      });

      ResultAssertionHelper.assertResultFailure(
        inventory.releaseReservation(15),
        'Cannot release more than reserved',
        DomainError,
      );
    });
  });

  describe('confirmReservation', () => {
    it('reduces reserved without restoring available', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 80,
        reservedQuantity: 20,
      });

      ResultAssertionHelper.assertResultSuccess(
        inventory.confirmReservation(5),
      );

      expect(inventory.availableQuantity).toBe(80);
      expect(inventory.reservedQuantity).toBe(15);
    });
  });

  describe('stock queries', () => {
    it('detects in stock and low stock', () => {
      const inStock = InventoryTestFactory.createDomainInventory({
        availableQuantity: 50,
        lowStockThreshold: 10,
      });
      const lowStock = InventoryTestFactory.createDomainInventory({
        availableQuantity: 5,
        lowStockThreshold: 10,
      });

      const inStockResult = inStock.isInStock(1);
      ResultAssertionHelper.assertResultSuccess(inStockResult);
      expect(inStockResult.value).toBe(true);
      expect(lowStock.hasLowStock()).toBe(true);
      expect(inStock.canFulfillQuantity(50)).toBe(true);
    });

    it('increaseStock and decreaseStock adjust available quantity', () => {
      const inventory = InventoryTestFactory.createDomainInventory({
        availableQuantity: 10,
        reservedQuantity: 0,
      });

      ResultAssertionHelper.assertResultSuccess(inventory.increaseStock(5));
      expect(inventory.availableQuantity).toBe(15);

      ResultAssertionHelper.assertResultSuccess(inventory.decreaseStock(3));
      expect(inventory.availableQuantity).toBe(12);
    });
  });
});
