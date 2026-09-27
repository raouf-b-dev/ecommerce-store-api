import {
  CategoryResult,
  MockCategoryQueryService,
} from 'src/modules/products/testing';
import { ListCategoriesUseCase } from './list-categories.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let mockQueryService: MockCategoryQueryService;

  const operator = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set([VIEW_ALL_PRODUCTS_PERMISSION]),
  });
  const customer = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  const sampleCategory: CategoryResult = {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    description: null,
    isActive: true,
    productCount: 3,
  };

  beforeEach(() => {
    mockQueryService = new MockCategoryQueryService();
    useCase = new ListCategoriesUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns category read models', async () => {
    mockQueryService.mockSuccessfulList([sampleCategory]);

    const result = await useCase.execute({ isActive: true });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([sampleCategory]);
    expect(mockQueryService.list).toHaveBeenCalledWith({ isActive: true });
  });

  it('forces isActive true for shoppers even when they request inactive', async () => {
    mockQueryService.mockSuccessfulList([]);

    await useCase.execute({ isActive: false }, customer);

    expect(mockQueryService.list).toHaveBeenCalledWith({ isActive: true });
  });

  it('leaves operator isActive filter unchanged', async () => {
    mockQueryService.mockSuccessfulList([]);

    await useCase.execute({ isActive: false }, operator);

    expect(mockQueryService.list).toHaveBeenCalledWith({ isActive: false });
  });

  it('returns UseCaseError when the query service fails', async () => {
    mockQueryService.list.mockResolvedValue(
      Result.failure(new QueryError('DB Error')),
    );

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to load categories',
      UseCaseError,
    );
  });
});
