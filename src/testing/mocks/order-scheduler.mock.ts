// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../shared-kernel/domain/result';
import { OrderScheduler } from '../../modules/orders/core/domain/schedulers/order.scheduler';

export class MockOrderScheduler extends OrderScheduler {
  scheduleCheckout = jest.fn();
  schedulePostPayment = jest.fn();
  scheduleStockRelease = jest.fn();
  schedulePostConfirmation = jest
    .fn()
    .mockResolvedValue(Result.success('flow-id'));
  scheduleOrderStockRelease = jest.fn();
  schedulePendingOrdersExpiration = jest.fn();
}
