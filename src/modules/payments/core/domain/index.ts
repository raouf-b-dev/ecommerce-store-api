// src/modules/payments/core/domain/index.ts
// Export types for use by other modules (e.g., Orders)

// Value object types
export { PaymentMethodType } from './value-objects/payment-method';
export { PaymentStatusType } from './value-objects/payment-status';
export { RefundStatusType } from './value-objects/refund-status';

// Entity props types (for type safety without tight coupling)
export type { PaymentProps } from './entities/payment';
export type { RefundProps } from './entities/refund';

// Interface types
export type { IPayment } from './interfaces/payment.interface';
export type { IRefund } from './interfaces/refund.interface';
