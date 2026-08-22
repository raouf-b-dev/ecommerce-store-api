export interface CartItemPresentationDTO {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  itemTotal: number;
  imageUrl: string | null;
}

export interface CartPresentationDTO {
  id: number;
  userId: number;
  items: CartItemPresentationDTO[];
  totalQuantity: number;
  grandTotal: number;
  updatedAt: string;
}
