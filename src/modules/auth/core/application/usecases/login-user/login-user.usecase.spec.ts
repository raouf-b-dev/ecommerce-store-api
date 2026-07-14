import { MockJwtSignerService } from '../../../../../../testing/mocks/jwt-signer.service.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { MockPasswordHasher } from '../../../../testing/mocks/password-hasher.mock';
import { IdentityAccessGatewayMock } from '../../../../testing/mocks/identity-access-gateway.mock';
import { LoginUserUseCase } from './login-user.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { SessionToken } from '../../../domain/entities/session-token';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { UserCredentials } from '../../ports/access.gateway';

/** Default active customer credentials */
const defaultCredentials: UserCredentials = {
  id: 123,
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  isActive: true,
  roleId: 2,
};

describe('LoginUserUseCase', () => {
  let usecase: LoginUserUseCase;
  let accessGateway: IdentityAccessGatewayMock;
  let sessionTokenRepository: MockSessionTokenRepository;
  let passwordHasher: MockPasswordHasher;
  let jwtSignerService: MockJwtSignerService;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(() => {
    accessGateway = new IdentityAccessGatewayMock();
    sessionTokenRepository = new MockSessionTokenRepository();
    passwordHasher = new MockPasswordHasher();
    jwtSignerService = new MockJwtSignerService();
    domainEventPublisher = { publish: jest.fn() };

    usecase = new LoginUserUseCase(
      accessGateway,
      sessionTokenRepository,
      passwordHasher,
      jwtSignerService,
      domainEventPublisher,
    );

    // Default role resolution
    accessGateway.mockSuccessfulFindRoleById({ id: 2, code: 'CUSTOMER' });
  });

  afterEach(() => {
    accessGateway.reset();
    sessionTokenRepository.reset();
  });

  it('should login a user successfully', async () => {
    accessGateway.mockSuccessfulFindByEmail(defaultCredentials);
    sessionTokenRepository.save.mockResolvedValue(
      Result.success(
        SessionToken.create(
          defaultCredentials.id,
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
    expect(result.value.accessToken).toBeTruthy();
    expect(result.value.refreshToken).toBeTruthy();
  });

  it('should return failure if user is not found', async () => {
    accessGateway.mockUserNotFoundByEmail();

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
    accessGateway.mockSuccessfulFindByEmail(defaultCredentials);
    passwordHasher.compare.mockResolvedValue(false);

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'wrong-password',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });

  it('should return failure if user is deactivated', async () => {
    accessGateway.mockSuccessfulFindByEmail({
      ...defaultCredentials,
      isActive: false,
    });

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

  it('should return failure if user has no assigned role', async () => {
    accessGateway.mockSuccessfulFindByEmail({
      ...defaultCredentials,
      roleId: 0,
    });

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'User has no assigned role',
      UseCaseError,
    );
  });
});
