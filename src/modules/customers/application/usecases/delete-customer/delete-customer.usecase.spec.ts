import { DeleteCustomerUseCase } from './delete-customer.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new DeleteCustomerUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if customer is deleted', async () => {
      const customerId = 'customer-123';

      mockCustomerRepository.delete.mockResolvedValue(
        Result.success(undefined),
      );

      const result = await useCase.execute(customerId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.delete).toHaveBeenCalledWith(customerId);
    });

    it('should return Failure(UseCaseError) if deletion fails', async () => {
      const customerId = 'customer-123';

      mockCustomerRepository.delete.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to delete customer'),
      );

      const result = await useCase.execute(customerId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete customer',
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const customerId = 'customer-123';
      const repoError = new Error('Database connection failed');

      mockCustomerRepository.delete.mockRejectedValue(repoError);

      const result = await useCase.execute(customerId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });
  });
});
