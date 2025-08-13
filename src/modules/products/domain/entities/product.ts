import { IProduct } from '../interfaces/IProduct';

export class Product implements IProduct {
  id: number;
  name: string;
  description?: string | undefined;
  price: number;
  sku?: string | undefined;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(productData: IProduct) {
    this.id = productData.id;
    this.name = productData.name;
    this.description = productData.description;
    this.price = productData.price;
    this.sku = productData.sku;
    this.stockQuantity = productData.stockQuantity;
    this.createdAt = productData.createdAt;
    this.updatedAt = productData.updatedAt;
  }
}
