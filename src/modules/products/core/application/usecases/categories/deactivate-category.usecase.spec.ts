import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { DeactivateCategoryUseCase } from './deactivate-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { QueryNotFoundError } from '../../../../../../shared-kernel/domain/exceptions/query.error';

describe('DeactivateCategoryUseCase', () => {
  let useCase: DeactivateCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    useCase = new DeactivateCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('deactivates an active category', async () => {
    const category = CategoryTestFactory.createDomainCategory({
      isActive: true,
    });
    mockRepository.mockSuccessfulFindById(category);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(category.isActive).toBe(false);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('returns DomainError when already inactive', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory({ isActive: false }),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category is already inactive',
      DomainError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
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
});
