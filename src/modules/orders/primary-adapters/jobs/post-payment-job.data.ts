// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { SchedulePostPaymentProps } from '../../core/domain/schedulers/order.scheduler';

export type PostPaymentJobData = SchedulePostPaymentProps & {
  flowId: string;
};
