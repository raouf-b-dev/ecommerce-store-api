export interface IProduct {
  id: string; // Changed from number to string for prefixed IDs like PR0000001
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}
