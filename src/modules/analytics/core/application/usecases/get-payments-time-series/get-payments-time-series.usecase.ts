import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AnalyticsQueryService } from '../../ports/analytics-query.service';
import { PaymentsTimeSeriesQuery } from '../../queries/payments-time-series.query';
import { PaymentsTimeSeriesResult } from '../../queries/results/payments-time-series.result';

@Injectable()
export class GetPaymentsTimeSeriesUseCase implements UseCase<
  PaymentsTimeSeriesQuery,
  PaymentsTimeSeriesResult,
  UseCaseError
> {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  async execute(
    query: PaymentsTimeSeriesQuery,
  ): Promise<Result<PaymentsTimeSeriesResult, UseCaseError>> {
    const result =
      await this.analyticsQueryService.getPaymentsTimeSeries(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
