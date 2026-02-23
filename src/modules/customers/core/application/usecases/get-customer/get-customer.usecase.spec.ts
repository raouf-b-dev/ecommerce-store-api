import { GetCustomerUseCase } from './get-customer.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';

describe('GetCustomerUseCase', () => {
  let useCase: GetCustomerUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new GetCustomerUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with customer if found', async () => {
      const customerId = 123;
      const mockCustomerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
      });

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);

      const result = await useCase.execute(customerId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(customerId);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute(customerId);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const customerId = 123;
      const repoError = new Error('Database connection failed');

      mockCustomerRepository.findById.mockRejectedValue(repoError);

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
