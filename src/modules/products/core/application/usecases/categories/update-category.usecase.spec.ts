import { HttpStatus } from '@nestjs/common';
import {
  CategoryTestFactory,
  MockCategoryRepository,
} from 'src/modules/products/testing';
import { UpdateCategoryUseCase } from './update-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { QueryNotFoundError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    mockRepository.mockNameExists(false);
    mockRepository.mockSlugExists(false);
    mockRepository.mockSuccessfulSave();
    useCase = new UpdateCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('updates name and regenerates slug', async () => {
    const category = CategoryTestFactory.createDomainCategory();
    mockRepository.mockSuccessfulFindById(category);

    const result = await useCase.execute({
      id: 1,
      name: 'Home & Garden',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.name).toBe('Home & Garden');
    expect(result.value.slug).toBe('home-garden');
    expect(mockRepository.existsByName).toHaveBeenCalledWith(
      'Home & Garden',
      1,
    );
    expect(mockRepository.existsBySlug).toHaveBeenCalledWith('home-garden', 1);
  });

  it('returns QueryNotFoundError when missing', async () => {
    mockRepository.mockMissingCategory();

    const result = await useCase.execute({ id: 99, name: 'Books' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with id 99 not found',
    );
    expect(result.isFailure && result.error).toBeInstanceOf(QueryNotFoundError);
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns 409 when another category already has the name', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory(),
    );
    mockRepository.mockNameExists(true);

    const result = await useCase.execute({ id: 1, name: 'Clothing' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with name Clothing already exists',
      UseCaseError,
    );
    expect(result.isFailure && result.error.statusCode).toBe(
      HttpStatus.CONFLICT,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns DomainError when name is empty', async () => {
    mockRepository.mockSuccessfulFindById(
      CategoryTestFactory.createDomainCategory(),
    );

    const result = await useCase.execute({ id: 1, name: '  ' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category name is required',
      DomainError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns UseCaseError when the repository fails', async () => {
    mockRepository.findById.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

    const result = await useCase.execute({ id: 1, name: 'Sports' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to find category',
      UseCaseError,
    );
  });
});
