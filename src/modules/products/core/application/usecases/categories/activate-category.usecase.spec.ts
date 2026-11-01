import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { ActivateCategoryUseCase } from './activate-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';

describe('ActivateCategoryUseCase', () => {
  let useCase: ActivateCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    useCase = new ActivateCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('activates an inactive category', async () => {
    const category = CategoryTestFactory.createDomainCategory({
      isActive: false,
    });
    mockRepository.mockSuccessfulFindById(category);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(category.isActive).toBe(true);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('returns DomainError when already active', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory({ isActive: true }),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category is already active',
      DomainError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns CATEGORY_NOT_FOUND when missing', async () => {
    mockRepository.mockMissingCategory();

    const result = await useCase.execute(99);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 99 not found',
    );
    expect(result.error).toMatchObject({
      kind: ErrorKind.NOT_FOUND,
      code: ErrorCode.CATEGORY_NOT_FOUND,
    });
  });
});
