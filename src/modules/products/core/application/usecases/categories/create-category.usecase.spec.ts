import { HttpStatus } from '@nestjs/common';
import { MockCategoryRepository } from 'src/modules/products/testing';
import { CreateCategoryUseCase } from './create-category.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let mockRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    mockRepository.mockNameExists(false);
    mockRepository.mockSlugExists(false);
    mockRepository.mockSuccessfulSave();
    useCase = new CreateCategoryUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('creates a category and returns the read model', async () => {
    const result = await useCase.execute({
      name: 'Home & Garden',
      description: 'Household goods',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      id: 10,
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Household goods',
      isActive: true,
    });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('returns 409 when the name already exists', async () => {
    mockRepository.mockNameExists(true);

    const result = await useCase.execute({ name: 'Electronics' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with name Electronics already exists',
      UseCaseError,
    );
    expect(result.isFailure && result.error.statusCode).toBe(
      HttpStatus.CONFLICT,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns 409 when the slug already exists', async () => {
    mockRepository.mockSlugExists(true);

    const result = await useCase.execute({
      name: 'Gadgets',
      slug: 'electronics',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category with slug electronics already exists',
      UseCaseError,
    );
    expect(result.isFailure && result.error.statusCode).toBe(
      HttpStatus.CONFLICT,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns UseCaseError when save fails', async () => {
    mockRepository.save.mockResolvedValue(
      Result.failure(new RepositoryError('DB Error')),
    );

    const result = await useCase.execute({ name: 'Sports' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to create category',
      UseCaseError,
    );
  });

  it('returns UseCaseError when name is empty', async () => {
    const result = await useCase.execute({ name: '   ' });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Category name is required',
      UseCaseError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});
