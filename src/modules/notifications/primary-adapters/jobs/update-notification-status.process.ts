// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/domain/exceptions/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/infrastructure/jobs/base-job.handler';
import { UpdateNotificationStatusService } from '../../core/application/services/update-notification-status.service';
import { Job } from 'bullmq';
import { NotificationStatus } from '../../core/domain/enums/notification-status.enum';
import { CorrelationService } from 'src/infrastructure/logging/correlation/correlation.service';

export interface UpdateStatusProps {
  notificationId: string;
  status: NotificationStatus;
  reason?: string;
}

@Injectable()
export class UpdateNotificationStatusProcess extends BaseJobHandler<
  UpdateStatusProps,
  void
> {
  protected readonly logger = new Logger(UpdateNotificationStatusProcess.name);

  constructor(
    private readonly updateNotificationStatusService: UpdateNotificationStatusService,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<UpdateStatusProps>,
  ): Promise<Result<void, AppError>> {
    const { notificationId, status, reason } = job.data;
    return this.updateNotificationStatusService.execute({
      notificationId,
      status,
      reason,
    });
  }
}
