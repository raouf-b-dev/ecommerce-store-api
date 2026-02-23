import { AddAddressUseCase } from './add-address.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { CustomerDtoTestFactory } from '../../../../testing/factories/customer-dto.test.factory';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { AddressType } from '../../../domain/value-objects/address-type';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';

describe('AddAddressUseCase', () => {
  let useCase: AddAddressUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new AddAddressUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is added', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto();
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.street).toBe(addAddressDto.street);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should add home address', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto({
        type: AddressType.HOME,
      });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add work address', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto({
        type: AddressType.WORK,
      });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add address with delivery instructions', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto({
        deliveryInstructions: 'Leave at front door',
      });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData as any);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto();

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(RepositoryError) if update fails', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto();

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const customerId = 123;
      const addAddressDto = CustomerDtoTestFactory.createAddAddressDto();
      const repoError = new Error('Database connection failed');

      mockCustomerRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute({ customerId, dto: addAddressDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });
  });
});
