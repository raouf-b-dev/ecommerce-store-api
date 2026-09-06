import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { ListCategoriesUseCase } from './list-categories.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let mockRepository: MockCategoryRepository;

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

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    useCase = new ListCategoriesUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('returns category read models', async () => {
    mockRepository.mockSuccessfulFindAll([
      CategoryTestFactory.createDomainCategory(),
    ]);

    const result = await useCase.execute({ isActive: true });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([
      {
        id: 1,
        name: 'Electronics',
        slug: 'electronics',
        description: null,
        isActive: true,
      },
    ]);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ isActive: true });
  });

  it('forces isActive true for shoppers even when they request inactive', async () => {
    mockRepository.mockSuccessfulFindAll([]);

    await useCase.execute({ isActive: false }, customer);

    expect(mockRepository.findAll).toHaveBeenCalledWith({ isActive: true });
  });

  it('leaves operator isActive filter unchanged', async () => {
    mockRepository.mockSuccessfulFindAll([]);

    await useCase.execute({ isActive: false }, operator);

    expect(mockRepository.findAll).toHaveBeenCalledWith({ isActive: false });
  });

  it('returns UseCaseError when the repository fails', async () => {
    mockRepository.findAll.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to load categories',
      UseCaseError,
    );
  });
});
