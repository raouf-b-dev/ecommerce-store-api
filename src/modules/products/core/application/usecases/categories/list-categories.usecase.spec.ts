import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { ListCategoriesUseCase } from './list-categories.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let mockRepository: MockCategoryRepository;

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
