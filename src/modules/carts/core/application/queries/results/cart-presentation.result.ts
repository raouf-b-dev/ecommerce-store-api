export interface CartItemPresentationDTO {
  id: number | null;
  productId: number;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
  sku: string | null;
}

export interface CartPresentationDTO {
  id: number | null;
  userId: number;
  items: CartItemPresentationDTO[];
  itemCount: number;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}
