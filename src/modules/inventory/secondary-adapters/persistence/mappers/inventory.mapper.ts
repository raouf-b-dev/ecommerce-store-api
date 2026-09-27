import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import {
  Inventory,
  InventoryProps,
} from '../../../core/domain/entities/inventory';
import { IInventory } from '../../../core/domain/interfaces/inventory.interface';
import { InventoryEntity } from '../../orm/inventory.schema';

type InventoryCreate = CreateFromEntity<InventoryEntity, 'version'>;
export type InventoryForCache = Omit<
  IInventory,
  'createdAt' | 'updatedAt' | 'lastRestockDate'
> & {
  createdAt: number;
  updatedAt: number;
  lastRestockDate: number | null;
};

export class InventoryMapper {
  static toDomain(entity: InventoryEntity): Inventory {
    const props: InventoryProps = {
      id: entity.id,
      productId: entity.productId,
      availableQuantity: entity.availableQuantity,
      reservedQuantity: entity.reservedQuantity,
      lowStockThreshold: entity.lowStockThreshold,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastRestockDate: entity.lastRestockDate,
    };

    return Inventory.fromPrimitives(props);
  }

  static toEntity(domain: Inventory): InventoryEntity {
    const primitives = domain.toPrimitives();
    const inventoryPayload: InventoryCreate = {
      id: primitives.id || 0,
      productId: primitives.productId,
      availableQuantity: primitives.availableQuantity,
      reservedQuantity: primitives.reservedQuantity,
      lowStockThreshold: primitives.lowStockThreshold,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      lastRestockDate: primitives.lastRestockDate,
    };

    const inventoryEntity: InventoryEntity = Object.assign(
      new InventoryEntity(),
      inventoryPayload,
    );
    return inventoryEntity;
  }
  static toDomainArray(entities: InventoryEntity[]): Inventory[] {
    return entities.map((entity) => InventoryMapper.toDomain(entity));
  }

  static toEntityArray(domains: Inventory[]): InventoryEntity[] {
    return domains.map((domain) => InventoryMapper.toEntity(domain));
  }
}

export class InventoryCacheMapper {
  public static toCache(domain: Inventory): InventoryForCache {
    const primitives = domain.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
      lastRestockDate: primitives.lastRestockDate
        ? primitives.lastRestockDate.getTime()
        : null,
    };
  }

  public static fromCache(cached: InventoryForCache): Inventory | null {
    try {
      return Inventory.fromPrimitives({
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
        lastRestockDate:
          cached.lastRestockDate == null
            ? null
            : new Date(cached.lastRestockDate),
      });
    } catch {
      return null;
    }
  }
}
