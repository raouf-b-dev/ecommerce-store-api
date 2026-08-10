import { GetProductUseCase } from './get-product.usecase';
import { MockProductQueryService } from '../../../../testing/mocks/product-query-service.mock';
import { ProductDtoTestFactory } from '../../../../testing/factories/product-dto.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockQueryService: MockProductQueryService;

  beforeEach(() => {
    mockQueryService = new MockProductQueryService();
    useCase = new GetProductUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success if product is found', async () => {
      const sampleDetail = ProductDtoTestFactory.createProductDetailDTO({
        id: 1,
      });
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(mockQueryService.getById).toHaveBeenCalledWith(1);
    });

    it('should return Failure(UseCaseError) if product is not found', async () => {
      mockQueryService.mockSuccessfulGetById(null);

      const result = await useCase.execute(999);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product with id 999 not found',
        UseCaseError,
      );
    });
  });
});
