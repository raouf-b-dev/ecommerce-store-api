export const JobNames = {
  PROCESS_CHECKOUT: 'process-checkout', // Orchestrator
  VALIDATE_CART: 'validate-cart',
  RESOLVE_ADDRESS: 'resolve-address',
  RESERVE_STOCK: 'reserve-stock',
  CREATE_ORDER: 'create-order',
  PROCESS_PAYMENT: 'process-payment',
  CONFIRM_RESERVATION: 'confirm-reservation',
  CLEAR_CART: 'clear-cart',
  FINALIZE_CHECKOUT: 'finalize-checkout', // Parent job at end of flow
  // Compensations
  RELEASE_STOCK: 'release-stock',
  CANCEL_ORDER: 'cancel-order',
  REFUND_PAYMENT: 'refund-payment',

  SEND_NOTIFICATION: 'send-notification',
  SAVE_NOTIFICATION_HISTORY: 'save-notification-history',
} as const;

export type JobName = (typeof JobNames)[keyof typeof JobNames];
