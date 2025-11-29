import { ListCustomersUseCase } from './list-customers.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('ListCustomersUseCase', () => {
  let useCase: ListCustomersUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new ListCustomersUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with paginated customers', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();

      mockCustomerRepository.findAll.mockResolvedValue(Result.success([]));

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.findAll).toHaveBeenCalled();
    });

    it('should return Success with empty list if no customers found', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();

      mockCustomerRepository.findAll.mockResolvedValue(Result.success([]));

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(0);
    });

    it('should return Failure(UseCaseError) if repository fails', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();

      mockCustomerRepository.findAll.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to fetch customers'),
      );

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to fetch customers',
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();
      const repoError = new Error('Database connection failed');

      mockCustomerRepository.findAll.mockRejectedValue(repoError);

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });
  });
});
