export interface CartItemPresentationDTO {
  id: number;
  productId: number;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export interface CartPresentationDTO {
  id: number;
  userId: number;
  items: CartItemPresentationDTO[];
  itemCount: number;
  totalAmount: number;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}
