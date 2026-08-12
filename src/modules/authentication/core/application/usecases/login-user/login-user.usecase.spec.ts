import {
  AuthorizationGatewayMock,
  CredentialRepositoryMock,
  IdentityAccessGatewayDtoFactory,
  IdentityAccessGatewayMock,
  MockPasswordHasher,
  MockSessionTokenRepository,
} from 'src/modules/authentication/testing';
import { MockJwtSignerService } from 'src/testing';
import { LoginUserUseCase } from './login-user.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { SessionToken } from '../../../domain/entities/session-token';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { UserRecord } from '../../ports/identity.gateway';
import { Credential } from '../../../domain/entities/credential';

describe('LoginUserUseCase', () => {
  let defaultUserRecord: UserRecord;
  let defaultCredential: Credential;
  let usecase: LoginUserUseCase;
  let identityGateway: IdentityAccessGatewayMock;
  let authorizationGateway: AuthorizationGatewayMock;
  let credentialRepository: CredentialRepositoryMock;
  let sessionTokenRepository: MockSessionTokenRepository;
  let passwordHasher: MockPasswordHasher;
  let jwtSignerService: MockJwtSignerService;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(() => {
    defaultUserRecord = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 123,
      email: 'test@example.com',
      isActive: true,
    });
    defaultCredential = Credential.fromPersistence({
      id: 1,
      userId: 123,
      passwordHash: 'hashed_password',
      mustChangePassword: false,
    });
    identityGateway = new IdentityAccessGatewayMock();
    authorizationGateway = new AuthorizationGatewayMock();
    credentialRepository = new CredentialRepositoryMock();
    sessionTokenRepository = new MockSessionTokenRepository();
    passwordHasher = new MockPasswordHasher();
    jwtSignerService = new MockJwtSignerService();
    domainEventPublisher = { publish: jest.fn() };

    usecase = new LoginUserUseCase(
      identityGateway,
      authorizationGateway,
      credentialRepository,
      sessionTokenRepository,
      passwordHasher,
      jwtSignerService,
      domainEventPublisher,
    );

    // Default mocks
    identityGateway.mockFindUserByEmail(defaultUserRecord);
    credentialRepository.mockSuccessfulFindByUserId(defaultCredential);
    authorizationGateway.mockSuccessfulFindRoleByUserId({
      id: 2,
      code: 'CUSTOMER',
    });
    passwordHasher.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    identityGateway.reset();
    authorizationGateway.reset();
    credentialRepository.reset();
    sessionTokenRepository.reset();
  });

  it('should login a user successfully', async () => {
    sessionTokenRepository.save.mockResolvedValue(
      Result.success(
        SessionToken.create(
          defaultUserRecord.id,
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
    identityGateway.mockFindUserByEmail(null);

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
    identityGateway.mockFindUserByEmail({
      ...defaultUserRecord,
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
    authorizationGateway.mockSuccessfulFindRoleByUserId(null);

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'User role not found',
      UseCaseError,
    );
  });
});
