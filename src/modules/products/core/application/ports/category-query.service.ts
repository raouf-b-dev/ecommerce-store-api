import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';
import { ListCategoriesQuery } from '../queries/list-categories.query';
import { CategoryResult } from '../queries/results/category.result';

export abstract class CategoryQueryService {
  abstract list(
    query?: ListCategoriesQuery,
  ): Promise<Result<CategoryResult[], QueryError>>;

  abstract getById(
    id: number,
  ): Promise<Result<CategoryResult | null, QueryError>>;
}
