export interface IProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}
