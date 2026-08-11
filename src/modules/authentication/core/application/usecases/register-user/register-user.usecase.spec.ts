import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { RegisterUserUseCase } from './register-user.usecase';
import { MockPasswordHasher } from '../../../../testing/mocks/password-hasher.mock';
import { IdentityAccessGatewayMock } from 'src/modules/authentication/testing/mocks/identity-access-gateway.mock';
import { IdentityAccessGatewayDtoFactory } from 'src/modules/authentication/testing/factories/indentity-gateway-dto.factory';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { UserRecord, CreateUserInput } from '../../ports/identity.gateway';
import { AuthorizationGatewayMock } from 'src/modules/authentication/testing/mocks/authorization-gateway.mock';
import { CredentialRepositoryMock } from 'src/modules/authentication/testing/mocks/credential-repository.mock';
import { AuthenticationDtoFactory } from 'src/modules/authentication/testing/factories/authentication-dto.factory';
import { Credential } from '../../../domain/entities/credential';
import { RegisterCommand } from '../../commands/register.command';

describe('RegisterUserUseCase', () => {
  let usecase: RegisterUserUseCase;
  let identityAccessGatewayMock: IdentityAccessGatewayMock;
  let authorizationGatewayMock: AuthorizationGatewayMock;
  let credentialRepositorymock: CredentialRepositoryMock;
  let passwordHasher: MockPasswordHasher;
  let mockUserRecord: UserRecord;
  let mockCreateUserInput: CreateUserInput;
  let mockRegisterCommand: RegisterCommand;
  let credential: Credential;

  beforeEach(() => {
    credentialRepositorymock = new CredentialRepositoryMock();
    identityAccessGatewayMock = new IdentityAccessGatewayMock();
    authorizationGatewayMock = new AuthorizationGatewayMock();
    passwordHasher = new MockPasswordHasher();
    usecase = new RegisterUserUseCase(
      passwordHasher,
      identityAccessGatewayMock,
      authorizationGatewayMock,
      credentialRepositorymock,
    );
    mockUserRecord = IdentityAccessGatewayDtoFactory.buildUserRecord();
    mockCreateUserInput =
      IdentityAccessGatewayDtoFactory.buildCreateUserInput();
    mockRegisterCommand = AuthenticationDtoFactory.createRegisterCommand();
    credential = AuthenticationDtoFactory.buildCredentialEntity();
    // Default mocks
    credentialRepositorymock.mockSuccessfulSave(credential);
    authorizationGatewayMock.mockSuccessfulAssignDefaultRole();
  });

  afterEach(() => {
    identityAccessGatewayMock.reset();
    authorizationGatewayMock.reset();
    credentialRepositorymock.reset();
    passwordHasher.reset();
  });

  it('should register a user successfully', async () => {
    identityAccessGatewayMock.checkEmailExists.mockResolvedValue(
      Result.success(false),
    );
    const userResult = Result.success(mockUserRecord);
    identityAccessGatewayMock.createUser.mockResolvedValue(userResult);

    const result = await usecase.execute(mockRegisterCommand);

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('should return failure if email already exists', async () => {
    identityAccessGatewayMock.checkEmailExists.mockResolvedValue(
      Result.success(true),
    );

    const result = await usecase.execute(mockRegisterCommand);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User with this email already exists',
      UseCaseError,
    );
  });
});
