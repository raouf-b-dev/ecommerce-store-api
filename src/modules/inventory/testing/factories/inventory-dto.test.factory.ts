import { AdjustStockCommand } from '../../core/application/adjust-stock/adjust-stock.usecase';
import { ReservationInput } from '../../core/domain/repositories/reservation.repository';
import { LowStockQuery } from '../../core/domain/repositories/inventory.repository';
import { StockAdjustmentType } from '../../core/domain/value-objects/stock-adjustment-type';

export class InventoryCommandTestFactory {
  static createAdjustStockCommand(
    overrides?: Partial<AdjustStockCommand>,
  ): AdjustStockCommand {
    const baseCommand: AdjustStockCommand = {
      quantity: 50,
      type: StockAdjustmentType.ADD,
      reason: 'New shipment received',
    };

    return { ...baseCommand, ...overrides };
  }

  static createAddStockCommand(quantity: number = 50): AdjustStockCommand {
    return this.createAdjustStockCommand({
      quantity,
      type: StockAdjustmentType.ADD,
      reason: 'Restock from supplier',
    });
  }

  static createSubtractStockCommand(quantity: number = 10): AdjustStockCommand {
    return this.createAdjustStockCommand({
      quantity,
      type: StockAdjustmentType.SUBTRACT,
      reason: 'Damaged items removed',
    });
  }

  static createSetStockCommand(quantity: number = 100): AdjustStockCommand {
    return this.createAdjustStockCommand({
      quantity,
      type: StockAdjustmentType.SET,
      reason: 'Inventory count correction',
    });
  }

  static createReservationInput(
    overrides?: Partial<ReservationInput>,
  ): ReservationInput {
    const baseInput: ReservationInput = {
      orderId: 1,
      items: [
        {
          productId: 1,
          quantity: 2,
        },
      ],
    };

    return { ...baseInput, ...overrides };
  }

  static createMultiItemReservationInput(
    itemCount: number = 3,
  ): ReservationInput {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      productId: i + 1,
      quantity: i + 1,
    }));

    return this.createReservationInput({
      items,
    });
  }

  static createReservationForOrder(
    orderId: number,
    productId: number,
    quantity: number,
  ): ReservationInput {
    return this.createReservationInput({
      orderId,
      items: [{ productId, quantity }],
    });
  }

  static createLowStockQuery(
    overrides?: Partial<LowStockQuery>,
  ): LowStockQuery {
    const baseQuery: LowStockQuery = {
      threshold: 10,
      page: 1,
      limit: 20,
    };

    return { ...baseQuery, ...overrides };
  }

  static createCustomThresholdQuery(threshold: number): LowStockQuery {
    return this.createLowStockQuery({ threshold });
  }

  static createPaginatedQuery(page: number, limit: number): LowStockQuery {
    return this.createLowStockQuery({ page, limit });
  }

  static createInvalidAdjustStockCommand(): AdjustStockCommand {
    return {
      quantity: -10,
      type: 'INVALID_TYPE' as any,
      reason: '',
    };
  }

  static createInvalidReservationInput(): ReservationInput {
    return {
      orderId: 0,
      items: [],
    };
  }

  static createInvalidLowStockQuery(): LowStockQuery {
    return {
      threshold: -5,
      page: 0,
      limit: -10,
    };
  }

  static createZeroQuantityAdjustCommand(): AdjustStockCommand {
    return this.createAdjustStockCommand({
      quantity: 0,
      type: StockAdjustmentType.ADD,
    });
  }
}
