import { CreateCustomerUseCase } from './create-customer.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Result } from '../../../../../core/domain/result';
import { Customer, CustomerProps } from '../../../domain/entities/customer';
import { AddressType } from '../../../domain/value-objects/address-type';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { AddressProps } from '../../../domain/entities/address';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new CreateCustomerUseCase(mockCustomerRepository);
    mockCustomerRepository.save.mockImplementation((customer) => {
      const primitives = customer.toPrimitives();
      if (!primitives.id) {
        primitives.id = 'generated-id';
      }
      return Promise.resolve(
        Result.success(Customer.fromPrimitives(primitives)),
      );
    });
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if customer is created without address', async () => {
      const createCustomerDto =
        CustomerDtoTestFactory.createCreateCustomerDto();

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.firstName).toBe(createCustomerDto.firstName);
      expect(result.value.email).toBe(createCustomerDto.email);
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Success if customer is created with initial address', async () => {
      const createCustomerDto =
        CustomerDtoTestFactory.createCreateCustomerWithAddressDto();

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.addresses).toHaveLength(1);
      expect(result.value.addresses[0].isDefault).toBe(true);
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Success if customer is created with phone', async () => {
      const createCustomerDto = CustomerDtoTestFactory.createCreateCustomerDto({
        phone: '+9876543210',
      });

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.phone).toBe('+9876543210');
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if customer is not created', async () => {
      const createCustomerDto =
        CustomerDtoTestFactory.createCreateCustomerDto();
      const repoError = ErrorFactory.RepositoryError('Failed to save Customer');

      mockCustomerRepository.save.mockResolvedValue(repoError);

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save Customer',
        RepositoryError,
      );
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const createCustomerDto =
        CustomerDtoTestFactory.createCreateCustomerDto();
      const repoError = new Error('Unexpected error');

      mockCustomerRepository.save.mockRejectedValue(repoError);

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create customer with work address', async () => {
      const createCustomerDto =
        CustomerDtoTestFactory.createCreateCustomerWithAddressDto({
          address: CustomerDtoTestFactory.createAddAddressDto({
            type: AddressType.WORK,
          }),
        });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress();

      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulSave(mockCustomer);

      const result = await useCase.execute(createCustomerDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.addresses).toHaveLength(1);
    });
  });
});
