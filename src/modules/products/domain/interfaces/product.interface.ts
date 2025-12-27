export interface IProduct {
  id: number | null;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
}
