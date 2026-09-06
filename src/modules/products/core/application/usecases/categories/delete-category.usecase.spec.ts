import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { DeleteCategoryUseCase } from './delete-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { QueryNotFoundError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    useCase = new DeleteCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('deletes an existing category', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory(),
    );
    mockRepository.mockSuccessfulDelete();

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepository.deleteById).toHaveBeenCalledWith(1);
  });

  it('returns QueryNotFoundError when missing', async () => {
    mockRepository.mockMissingCategory();

    const result = await useCase.execute(99);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 99 not found',
    );
    expect(result.isFailure && result.error).toBeInstanceOf(QueryNotFoundError);
    expect(mockRepository.deleteById).not.toHaveBeenCalled();
  });

  it('returns UseCaseError when delete fails', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory(),
    );
    mockRepository.deleteById.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to delete category',
      UseCaseError,
    );
  });
});
