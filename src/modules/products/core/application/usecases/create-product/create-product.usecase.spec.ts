import {
  MockProductRepository,
  CreateProductInputFactory,
} from 'src/modules/products/testing';
import { CreateProductUseCase } from './create-product.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new CreateProductUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is created', async () => {
      const command = CreateProductInputFactory.createMockDto();

      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe('Test Product');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not created', async () => {
      const command = CreateProductInputFactory.createMockDto();

      mockRepository.mockSaveFailure('Failed to save product');

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        UseCaseError,
      );
    });

    it('should create expensive product', async () => {
      const expensiveCommand =
        CreateProductInputFactory.createExpensiveProductDto();

      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(expensiveCommand);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(35000);
    });
  });
});
