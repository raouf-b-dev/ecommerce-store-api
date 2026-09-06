import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AnalyticsQueryService } from '../../ports/analytics-query.service';
import { AnalyticsPeriodQuery } from '../../queries/analytics-period.query';
import { AnalyticsOverviewResult } from '../../queries/results/analytics-overview.result';
import { previousPeriodWindow } from '../../services/analytics-period.parser';

@Injectable()
export class GetAnalyticsOverviewUseCase implements UseCase<
  AnalyticsPeriodQuery,
  AnalyticsOverviewResult,
  UseCaseError
> {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  async execute(
    query: AnalyticsPeriodQuery,
  ): Promise<Result<AnalyticsOverviewResult, UseCaseError>> {
    const previous = previousPeriodWindow(query.from, query.to);
    const result = await this.analyticsQueryService.getOverview({
      from: query.from,
      to: query.to,
      previousFrom: previous.from,
      previousTo: previous.to,
    });
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
