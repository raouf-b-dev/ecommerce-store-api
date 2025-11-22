// src/modules/customers/domain/value-objects/customer-stats.ts
import { DomainError } from '../../../../core/errors/domain.error';

export class CustomerStats {
  private readonly _totalOrders: number;
  private readonly _totalSpent: number;

  constructor(totalOrders: number, totalSpent: number) {
    if (totalOrders < 0) {
      throw new DomainError('Total orders cannot be negative');
    }
    if (totalSpent < 0) {
      throw new DomainError('Total spent cannot be negative');
    }

    this._totalOrders = totalOrders;
    this._totalSpent = this.roundPrice(totalSpent);
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  get totalOrders(): number {
    return this._totalOrders;
  }

  get totalSpent(): number {
    return this._totalSpent;
  }

  get averageOrderValue(): number {
    if (this._totalOrders === 0) return 0;
    return this.roundPrice(this._totalSpent / this._totalOrders);
  }

  addOrder(amount: number): CustomerStats {
    if (amount < 0) {
      throw new DomainError('Order amount cannot be negative');
    }

    return new CustomerStats(this._totalOrders + 1, this._totalSpent + amount);
  }

  equals(other: CustomerStats): boolean {
    return (
      this._totalOrders === other._totalOrders &&
      this._totalSpent === other._totalSpent
    );
  }

  static empty(): CustomerStats {
    return new CustomerStats(0, 0);
  }

  static from(totalOrders: number, totalSpent: number): CustomerStats {
    return new CustomerStats(totalOrders, totalSpent);
  }
}
