import { DataSource } from 'typeorm';
import { InventoryEntity } from 'src/modules/inventory/secondary-adapters/orm/inventory.schema';

/**
 * Sets explicit absolute inventory state for concurrency scenarios.
 * Default seed uses availableQuantity: 50, reservedQuantity: 5 — avoid relative assertions.
 */
export async function seedSingleUnitInventory(
  dataSource: DataSource,
  productId: number,
): Promise<InventoryEntity> {
  const repo = dataSource.getRepository(InventoryEntity);
  await repo.update(
    { productId },
    { availableQuantity: 1, reservedQuantity: 0 },
  );
  const inventory = await repo.findOneByOrFail({ productId });
  if (inventory.availableQuantity !== 1 || inventory.reservedQuantity !== 0) {
    throw new Error(
      `seedSingleUnitInventory failed for product ${productId}: ` +
        `expected available=1 reserved=0, got available=${inventory.availableQuantity} reserved=${inventory.reservedQuantity}`,
    );
  }
  return inventory;
}
