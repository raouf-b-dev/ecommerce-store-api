import { ProductListItemDTO } from './product-list-item.result';

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string | null;
  updatedAt: string;
}
