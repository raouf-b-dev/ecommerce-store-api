import { UpdateCustomerUseCase } from './update-customer.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';

describe('UpdateCustomerUseCase', () => {
  let useCase: UpdateCustomerUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new UpdateCustomerUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if customer is updated', async () => {
      const customerId = 'customer-123';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto();
      const mockCustomerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should update only firstName and lastName', async () => {
      const customerId = 'customer-123';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto({
        firstName: 'Jane',
        lastName: 'Smith',
      });
      const mockCustomerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should update only phone number', async () => {
      const customerId = 'customer-123';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto({
        phone: '+9876543210',
      });
      const mockCustomerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
        phone: '+9876543210',
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.phone).toBe('+9876543210');
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 'non-existent-id';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto();

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
    });

    it('should return Failure(UseCaseError) if update fails', async () => {
      const customerId = 'customer-123';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto();

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const customerId = 'customer-123';
      const updateDto = CustomerDtoTestFactory.createUpdateCustomerDto();
      const repoError = new Error('Database connection failed');

      mockCustomerRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute({ id: customerId, dto: updateDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });
  });
});
