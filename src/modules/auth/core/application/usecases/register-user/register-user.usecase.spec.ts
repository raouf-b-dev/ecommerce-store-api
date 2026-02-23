import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { CreateCustomerUseCase } from '../../../../../customers/core/application/usecases/create-customer/create-customer.usecase';
import { ICustomer } from '../../../../../customers/core/domain/interfaces/customer.interface';
import { CreateCustomerDto } from '../../../../../customers/primary-adapters/dto/create-customer.dto';
import {
  CustomerDtoTestFactory,
  CustomerTestFactory,
} from '../../../../../customers/testing';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { RegisterUserUseCase } from './register-user.usecase';
import { MockBcryptService } from '../../../../testing/mocks/bcrypt-service.mock';

describe('RegisterUserUseCase', () => {
  let usecase: RegisterUserUseCase;
  let userRepository: MockUserRepository;
  let createCustomerUseCase: jest.Mocked<CreateCustomerUseCase>;
  let bcryptService: MockBcryptService;
  let mockDomainUser: User;
  let customerDto: CreateCustomerDto;
  let mockCustomer: ICustomer;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    createCustomerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateCustomerUseCase>;

    bcryptService = new MockBcryptService();
    usecase = new RegisterUserUseCase(
      userRepository,
      bcryptService,
      createCustomerUseCase,
    );
    mockDomainUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser(),
    );
    mockCustomer = CustomerTestFactory.createMockCustomer();
    customerDto = CustomerDtoTestFactory.createCreateCustomerDto();
  });

  afterEach(() => {
    userRepository.reset();
  });

  it('should register a user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null)); // User does not exist
    const customerResult = Result.success(mockCustomer);
    createCustomerUseCase.execute.mockResolvedValue(customerResult);
    userRepository.save.mockResolvedValue(Result.success(mockDomainUser));

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
    });

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('should return failure if user already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null)); // Race condition simulation
    createCustomerUseCase.execute.mockResolvedValue(
      Result.success(mockCustomer),
    );
    userRepository.save.mockResolvedValue(
      ErrorFactory.RepositoryError('User with this email already exists'),
    );

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'User with this email already exists',
      RepositoryError,
    );
  });

  it('should return failure if unexpected error occurs', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    createCustomerUseCase.execute.mockResolvedValue(
      Result.success(mockCustomer),
    );
    userRepository.save.mockRejectedValue(new Error('Unexpected error'));

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
      phone: '1234567890',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error',
      UseCaseError,
    );
  });
});
