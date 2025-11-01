// src/modules/inventory/testing/factories/inventory-dto.test.factory.ts
import {
  AdjustStockDto,
  StockAdjustmentType,
} from '../../presentation/dto/adjust-stock.dto';
import { ReserveStockDto } from '../../presentation/dto/reserve-stock.dto';
import { ReserveStockItemDto } from '../../presentation/dto/reserve-stock-item.dto';
import { LowStockQueryDto } from '../../presentation/dto/low-stock-query.dto';

export class InventoryDtoTestFactory {
  static createAdjustStockDto(
    overrides?: Partial<AdjustStockDto>,
  ): AdjustStockDto {
    const baseDto: AdjustStockDto = {
      quantity: 50,
      type: StockAdjustmentType.ADD,
      reason: 'New shipment received',
    };

    return { ...baseDto, ...overrides };
  }

  static createAddStockDto(quantity: number = 50): AdjustStockDto {
    return this.createAdjustStockDto({
      quantity,
      type: StockAdjustmentType.ADD,
      reason: 'Restock from supplier',
    });
  }

  static createSubtractStockDto(quantity: number = 10): AdjustStockDto {
    return this.createAdjustStockDto({
      quantity,
      type: StockAdjustmentType.SUBTRACT,
      reason: 'Damaged items removed',
    });
  }

  static createSetStockDto(quantity: number = 100): AdjustStockDto {
    return this.createAdjustStockDto({
      quantity,
      type: StockAdjustmentType.SET,
      reason: 'Inventory count correction',
    });
  }

  static createReserveStockDto(
    overrides?: Partial<ReserveStockDto>,
  ): ReserveStockDto {
    const baseDto: ReserveStockDto = {
      orderId: 'OR0000001',
      items: [
        {
          productId: 'PR0000001',
          quantity: 2,
        },
      ],
    };

    return { ...baseDto, ...overrides };
  }

  static createReserveStockItemDto(
    overrides?: Partial<ReserveStockItemDto>,
  ): ReserveStockItemDto {
    const baseDto: ReserveStockItemDto = {
      productId: 'PR0000001',
      quantity: 1,
    };

    return { ...baseDto, ...overrides };
  }

  static createMultiItemReserveDto(itemCount: number = 3): ReserveStockDto {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      productId: `PR${(i + 1).toString().padStart(7, '0')}`,
      quantity: i + 1,
    }));

    return this.createReserveStockDto({
      items,
    });
  }

  static createReserveForOrder(
    orderId: string,
    productId: string,
    quantity: number,
  ): ReserveStockDto {
    return this.createReserveStockDto({
      orderId,
      items: [{ productId, quantity }],
    });
  }

  static createLowStockQueryDto(
    overrides?: Partial<LowStockQueryDto>,
  ): LowStockQueryDto {
    const baseDto: LowStockQueryDto = {
      threshold: 10,
      page: 1,
      limit: 20,
    };

    return { ...baseDto, ...overrides };
  }

  static createCustomThresholdQueryDto(threshold: number): LowStockQueryDto {
    return this.createLowStockQueryDto({ threshold });
  }

  static createPaginatedQueryDto(
    page: number,
    limit: number,
  ): LowStockQueryDto {
    return this.createLowStockQueryDto({ page, limit });
  }

  static createInvalidAdjustStockDto(): AdjustStockDto {
    return {
      quantity: -10,
      type: 'INVALID_TYPE' as any,
      reason: '',
    };
  }

  static createInvalidReserveStockDto(): ReserveStockDto {
    return {
      orderId: '',
      items: [],
    };
  }

  static createInvalidLowStockQueryDto(): LowStockQueryDto {
    return {
      threshold: -5,
      page: 0,
      limit: -10,
    };
  }

  static createZeroQuantityAdjustDto(): AdjustStockDto {
    return this.createAdjustStockDto({
      quantity: 0,
      type: StockAdjustmentType.ADD,
    });
  }
}
