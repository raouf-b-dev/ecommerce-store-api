// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/domain/exceptions/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/infrastructure/jobs/base-job.handler';
import { CleanupExpiredNotificationsService } from '../../core/application/services/cleanup-expired-notifications.service';
import { Job } from 'bullmq';
import { CorrelationService } from 'src/infrastructure/logging/correlation/correlation.service';

@Injectable()
export class CleanupExpiredNotificationsProcess extends BaseJobHandler<
  void,
  void
> {
  protected readonly logger = new Logger(
    CleanupExpiredNotificationsProcess.name,
  );

  constructor(
    private readonly cleanupService: CleanupExpiredNotificationsService,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(job: Job<void>): Promise<Result<void, AppError>> {
    this.logger.log(
      `Cleaning expired notifications for job ${job.id ?? 'unknown'}...`,
    );
    return this.cleanupService.execute();
  }
}
