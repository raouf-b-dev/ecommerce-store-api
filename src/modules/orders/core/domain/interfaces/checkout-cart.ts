export interface CheckoutCartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export interface CheckoutCartInfo {
  id: number | null;
  customerId: number | null;
  items: CheckoutCartItem[];
}
