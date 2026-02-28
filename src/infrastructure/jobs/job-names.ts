export const JobNames = {
  PROCESS_CHECKOUT: 'process-checkout', // Orchestrator
  VALIDATE_CART: 'validate-cart',
  RESOLVE_ADDRESS: 'resolve-address',
  RESERVE_STOCK: 'reserve-stock',
  CREATE_ORDER: 'create-order',
  PROCESS_PAYMENT: 'process-payment',
  CONFIRM_RESERVATION: 'confirm-reservation',
  CONFIRM_ORDER: 'confirm-order',
  CLEAR_CART: 'clear-cart',
  FINALIZE_CHECKOUT: 'finalize-checkout', // Parent job at end of flow
  // Compensations
  RELEASE_STOCK: 'release-stock',
  RELEASE_ORDER_STOCK: 'release-order-stock',
  CANCEL_ORDER: 'cancel-order',
  REFUND_PAYMENT: 'refund-payment',

  SEND_NOTIFICATION: 'send-notification',
  SAVE_NOTIFICATION_HISTORY: 'save-notification-history',
  UPDATE_NOTIFICATION_STATUS: 'update-notification-status',
  CLEANUP_NOTIFICATIONS: 'cleanup-notifications',

  // Payment Events
  PAYMENT_COMPLETED: 'payment-completed',
  PAYMENT_FAILED: 'payment-failed',
} as const;

export type JobName = (typeof JobNames)[keyof typeof JobNames];
