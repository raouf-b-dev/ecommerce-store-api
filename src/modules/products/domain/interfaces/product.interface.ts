export interface IProduct {
  id: string; // Changed from number to string for prefixed IDs like PR0000001
  name: string;
  description?: string;
  price: number;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
}
