// src/modules/inventory/domain/value-objects/stock-adjustment-reason.ts
export enum StockAdjustmentReasonType {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  RESTOCK = 'RESTOCK',
  DAMAGE = 'DAMAGE',
  LOST = 'LOST',
  RETURN = 'RETURN',
  INVENTORY_COUNT = 'INVENTORY_COUNT',
  CORRECTION = 'CORRECTION',
}

export class StockAdjustmentReason {
  private readonly _type: StockAdjustmentReasonType;
  private readonly _notes: string | null;

  constructor(type: StockAdjustmentReasonType, notes?: string) {
    this._type = type;
    this._notes = notes ? notes.trim() : null;
  }

  get type(): StockAdjustmentReasonType {
    return this._type;
  }

  get notes(): string | null {
    return this._notes;
  }

  toString(): string {
    return this._notes ? `${this._type}: ${this._notes}` : this._type;
  }

  static restock(notes?: string): StockAdjustmentReason {
    return new StockAdjustmentReason(StockAdjustmentReasonType.RESTOCK, notes);
  }

  static damage(notes?: string): StockAdjustmentReason {
    return new StockAdjustmentReason(StockAdjustmentReasonType.DAMAGE, notes);
  }

  static correction(notes?: string): StockAdjustmentReason {
    return new StockAdjustmentReason(
      StockAdjustmentReasonType.CORRECTION,
      notes,
    );
  }
}
