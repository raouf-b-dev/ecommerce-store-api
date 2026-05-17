import { MockJwtSignerService } from '../../../../../../testing/mocks/jwt-signer.service.mock';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { MockPasswordHasher } from '../../../../testing/mocks/password-hasher.mock';
import { LoginUserUseCase } from './login-user.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { User } from '../../../domain/entities/user';
import { SessionToken } from '../../../domain/entities/session-token';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Role } from '../../../domain/entities/role';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

describe('LoginUserUseCase', () => {
  let usecase: LoginUserUseCase;
  let userRepository: MockUserRepository;
  let roleRepository: MockRoleRepository;
  let sessionTokenRepository: MockSessionTokenRepository;
  let passwordHasher: MockPasswordHasher;
  let jwtSignerService: MockJwtSignerService;
  let domainEventPublisher: DomainEventPublisher;

  let mockDomainUser: User;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    roleRepository = new MockRoleRepository();
    sessionTokenRepository = new MockSessionTokenRepository();
    passwordHasher = new MockPasswordHasher();
    jwtSignerService = new MockJwtSignerService();
    domainEventPublisher = { publish: jest.fn() };

    usecase = new LoginUserUseCase(
      userRepository,
      roleRepository,
      sessionTokenRepository,
      passwordHasher,
      jwtSignerService,
      domainEventPublisher,
    );
    mockDomainUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser(),
    );

    // Default: resolve role from roleId returns a valid role
    roleRepository.findById.mockResolvedValue(
      Result.success(
        new Role({
          id: 2,
          code: 'CUSTOMER',
          name: 'Customer',
          isSystem: true,
          permissions: [],
        }),
      ),
    );
  });

  afterEach(() => {
    userRepository.reset();
    sessionTokenRepository.reset();
  });

  it('should login a user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.success(mockDomainUser),
    );
    sessionTokenRepository.save.mockResolvedValue(
      Result.success(
        SessionToken.create(
          mockDomainUser.id!,
          'dummy-refresh-token',
          new Date('2025-01-01T12:00:00Z'),
        ),
      ),
    );

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.accessToken).toContain('header');
    expect(result.value.refreshToken).toContain('header');
  });

  it('should return failure if user is not found', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });

  it('should return failure if password is incorrect', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.success(mockDomainUser),
    );
    passwordHasher.compare.mockResolvedValue(false);
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });

  it('should return failure if user is deactivated', async () => {
    const deactivatedUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser({ isActive: false }),
    );
    userRepository.findByEmail.mockResolvedValue(
      Result.success(deactivatedUser),
    );

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });
});
