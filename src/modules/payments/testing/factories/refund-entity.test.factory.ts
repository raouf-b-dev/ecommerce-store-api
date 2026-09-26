// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { RefundEntity } from '../../secondary-adapters/orm/refund.schema';
import { RefundStatusType } from '../../core/domain/value-objects/refund-status';
import { PaymentEntity } from '../../secondary-adapters/orm/payment.schema';

export class RefundEntityTestFactory {
  static createRefundEntity(overrides?: Partial<RefundEntity>): RefundEntity {
    const defaultEntity: RefundEntity = {
      id: 1,
      paymentId: 1,
      amount: 50,
      currency: 'USD',
      reason: 'Defective product',
      status: RefundStatusType.COMPLETED,
      payment: {} as PaymentEntity, // Usually not needed for simple tests, or mocked separately
      createdAt: new Date('2025-01-02T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }
}
