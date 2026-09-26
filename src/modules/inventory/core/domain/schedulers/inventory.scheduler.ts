// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';

export abstract class InventoryScheduler {
  abstract scheduleReconciliationJob(): Promise<
    Result<{ jobId: string }, InfrastructureError>
  >;
}
