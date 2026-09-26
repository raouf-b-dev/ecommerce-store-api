// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface PaymentCompletedProps {
  orderId: number;
  paymentId: number;
  transactionId?: string;
  reservationId?: number;
  cartId?: number;
}

export interface PaymentFailedProps {
  orderId: number;
  paymentId: number;
  reason?: string;
  reservationId?: number;
}

export abstract class PaymentEventsScheduler {
  abstract emitPaymentCompleted(
    props: PaymentCompletedProps,
  ): Promise<Result<void, InfrastructureError>>;

  abstract emitPaymentFailed(
    props: PaymentFailedProps,
  ): Promise<Result<void, InfrastructureError>>;
}
