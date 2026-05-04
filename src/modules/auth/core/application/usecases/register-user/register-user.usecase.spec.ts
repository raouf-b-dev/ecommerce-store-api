import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { CustomerGateway, CustomerRecord } from '../../ports/customer.gateway';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { RegisterUserUseCase } from './register-user.usecase';
import { MockPasswordHasher } from '../../../../testing/mocks/password-hasher.mock';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';

describe('RegisterUserUseCase', () => {
  let usecase: RegisterUserUseCase;
  let userRepository: MockUserRepository;
  let roleRepository: MockRoleRepository;
  let mockCustomerGateway: jest.Mocked<CustomerGateway>;
  let passwordHasher: MockPasswordHasher;
  let mockDomainUser: User;
  let mockCustomerRecord: CustomerRecord;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    roleRepository = new MockRoleRepository();
    mockCustomerGateway = {
      createCustomer: jest.fn(),
    };

    passwordHasher = new MockPasswordHasher();
    usecase = new RegisterUserUseCase(
      userRepository,
      roleRepository,
      passwordHasher,
      mockCustomerGateway,
    );
    mockDomainUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser(),
    );
    mockCustomerRecord = { id: 1 };

    const customerRole = RoleTestFactory.buildEntity({ code: 'CUSTOMER' });
    roleRepository.findByCode.mockResolvedValue(Result.success(customerRole));
  });

  afterEach(() => {
    userRepository.reset();
  });

  it('should register a user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null)); // User does not exist
    const customerResult = Result.success(mockCustomerRecord);
    mockCustomerGateway.createCustomer.mockResolvedValue(customerResult);
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
    mockCustomerGateway.createCustomer.mockResolvedValue(
      Result.success(mockCustomerRecord),
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
});
