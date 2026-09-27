// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { SchedulePostPaymentProps } from '../../core/domain/schedulers/order.scheduler';

export type PostPaymentJobData = SchedulePostPaymentProps & {
  flowId: string;
};
