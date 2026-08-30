import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AnalyticsQueryService } from '../../ports/analytics-query.service';
import { InventoryAlertsQuery } from '../../queries/inventory-alerts.query';
import { InventoryAlertsResult } from '../../queries/results/inventory-alerts.result';

@Injectable()
export class GetInventoryAlertsUseCase implements UseCase<
  InventoryAlertsQuery,
  InventoryAlertsResult,
  UseCaseError
> {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  async execute(
    query: InventoryAlertsQuery,
  ): Promise<Result<InventoryAlertsResult, UseCaseError>> {
    const result = await this.analyticsQueryService.getInventoryAlerts(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
