// src/modules/carts/domain/interfaces/cart-item.interface.ts

export interface ICartItem {
  id: number | null;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}
