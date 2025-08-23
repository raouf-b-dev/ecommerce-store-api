// src/modules/products/application/dtos/product-response.dto.ts
export class ProductResponseDto {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}
