export enum OrderStatus {
  // Payment Phase
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_FAILED = 'payment_failed',

  // Confirmation & Fulfillment Phase
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',

  // Terminal States
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
