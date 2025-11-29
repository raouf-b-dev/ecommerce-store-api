import { SetDefaultAddressUseCase } from './set-default-address.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { DomainError } from '../../../../../core/errors/domain.error';

describe('SetDefaultAddressUseCase', () => {
  let useCase: SetDefaultAddressUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new SetDefaultAddressUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is set as default', async () => {
      const customerId = 'customer-123';
      const addressId = 'address-123';
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ customerId, addressId });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 'non-existent-id';
      const addressId = 'address-123';

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({ customerId, addressId });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(DomainError) if address not found', async () => {
      const customerId = 'customer-123';
      const addressId = 'non-existent-address';

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );

      const result = await useCase.execute({ customerId, addressId });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Address with ID ${addressId} not found`,
        DomainError,
      );
    });

    it('should return Failure(RepositoryError) if update fails', async () => {
      const customerId = 'customer-123';
      const addressId = 'address-123';

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createCustomerWithAddress({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({ customerId, addressId });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });
  });
});
