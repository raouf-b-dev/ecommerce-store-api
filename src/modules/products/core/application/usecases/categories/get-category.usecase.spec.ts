import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { GetCategoryUseCase } from './get-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { QueryNotFoundError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('GetCategoryUseCase', () => {
  let useCase: GetCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    useCase = new GetCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('returns the category read model', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory({
        id: 3,
        name: 'Home & Garden',
        slug: 'home-garden',
      }),
    );

    const result = await useCase.execute(3);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      id: 3,
      name: 'Home & Garden',
      slug: 'home-garden',
      description: null,
      isActive: true,
    });
  });

  it('returns QueryNotFoundError when missing', async () => {
    mockRepository.mockMissingCategory();

    const result = await useCase.execute(99);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 99 not found',
    );
    expect(result.isFailure && result.error).toBeInstanceOf(QueryNotFoundError);
  });

  it('hides inactive categories from shoppers as not found', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory({
        id: 8,
        isActive: false,
      }),
    );

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
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory({
        id: 8,
        name: 'Archive',
        slug: 'archive',
        isActive: false,
      }),
    );

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
  });

  it('returns UseCaseError when the repository fails', async () => {
    mockRepository.findById.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to find category',
      UseCaseError,
    );
  });
});
