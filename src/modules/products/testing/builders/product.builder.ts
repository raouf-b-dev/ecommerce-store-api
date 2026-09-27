// src/modules/products/testing/builders/product.builder.ts
import { IProduct } from '../../core/domain/interfaces/product.interface';
import { ProductTestFactory } from '../factories/product.factory';

export class ProductBuilder {
  private product: IProduct;

  constructor() {
    this.product = ProductTestFactory.createMockProduct();
  }

  withId(id: number): this {
    this.product.id = id;
    return this;
  }

  withName(name: string): this {
    this.product.name = name;
    return this;
  }

  withDescription(description?: string): this {
    this.product.description = description;
    return this;
  }

  withPrice(price: number): this {
    this.product.price = price;
    return this;
  }

  withSku(sku?: string): this {
    this.product.sku = sku;
    return this;
  }

  withCreatedAt(date: Date): this {
    this.product.createdAt = date;
    return this;
  }

  withUpdatedAt(date: Date): this {
    this.product.updatedAt = date;
    return this;
  }

  asBudget(): this {
    return this.withPrice(19.99).withName('Budget Product');
  }

  asMinimal(): this {
    this.product.description = undefined;
    this.product.sku = undefined;
    return this;
  }

  asNew(): this {
    const now = new Date();
    return this.withCreatedAt(now).withUpdatedAt(now);
  }

  asOld(): this {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    return this.withCreatedAt(lastYear).withUpdatedAt(lastYear);
  }

  build(): IProduct {
    return { ...this.product };
  }
}
