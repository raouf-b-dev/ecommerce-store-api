import {
  CategoryResult,
  MockCategoryQueryService,
} from 'src/modules/products/testing';
import { GetCategoryUseCase } from './get-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { QueryNotFoundError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('GetCategoryUseCase', () => {
  let useCase: GetCategoryUseCase;
  let mockQueryService: MockCategoryQueryService;

  beforeEach(() => {
    mockQueryService = new MockCategoryQueryService();
    useCase = new GetCategoryUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns the category read model', async () => {
    const category: CategoryResult = {
      id: 3,
      name: 'Home & Garden',
      slug: 'home-garden',
      description: null,
      isActive: true,
      productCount: 5,
    };
    mockQueryService.mockSuccessfulGetById(category);

    const result = await useCase.execute(3);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(category);
  });

  it('returns QueryNotFoundError when missing', async () => {
    mockQueryService.mockSuccessfulGetById(null);

    const result = await useCase.execute(99);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 99 not found',
    );
    expect(result.isFailure && result.error).toBeInstanceOf(QueryNotFoundError);
  });

  it('hides inactive categories from shoppers as not found', async () => {
    mockQueryService.mockSuccessfulGetById({
      id: 8,
      name: 'Archive',
      slug: 'archive',
      description: null,
      isActive: false,
      productCount: 0,
    });

    const result = await useCase.execute(
      8,
      createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      }),
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 8 not found',
    );
    expect(result.isFailure && result.error).toBeInstanceOf(QueryNotFoundError);
  });

  it('returns inactive categories to operators with view_all_products', async () => {
    mockQueryService.mockSuccessfulGetById({
      id: 8,
      name: 'Archive',
      slug: 'archive',
      description: null,
      isActive: false,
      productCount: 2,
    });

    const result = await useCase.execute(
      8,
      createUserCallerContext({
        userId: 1,
        role: 'ADMIN',
        permissions: new Set([VIEW_ALL_PRODUCTS_PERMISSION]),
      }),
    );

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.isActive).toBe(false);
    expect(result.value.productCount).toBe(2);
  });

  it('returns UseCaseError when the query service fails', async () => {
    mockQueryService.getById.mockResolvedValue(
      Result.failure(new QueryError('DB Error')),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to find category',
      UseCaseError,
    );
  });
});
