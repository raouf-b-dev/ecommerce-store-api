// src/modules/carts/domain/interfaces/cart-item.interface.ts

export interface ICartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}
