import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AnalyticsQueryService } from '../../ports/analytics-query.service';
import { TopProductsQuery } from '../../queries/top-products.query';
import { TopProductsResult } from '../../queries/results/top-products.result';

@Injectable()
export class GetTopProductsUseCase implements UseCase<
  TopProductsQuery,
  TopProductsResult,
  UseCaseError
> {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  async execute(
    query: TopProductsQuery,
  ): Promise<Result<TopProductsResult, UseCaseError>> {
    const result = await this.analyticsQueryService.getTopProducts(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
