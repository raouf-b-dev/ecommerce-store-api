import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { User } from '../../../../../access/core/domain/entities/user';
import { UserTestFactory } from '../../../../../access/testing/factories/user.factory';
import { RegisterCommand, RegisterUserUseCase } from './register-user.usecase';
import { MockPasswordHasher } from '../../../../testing/mocks/password-hasher.mock';
import { RoleTestFactory } from '../../../../../access/testing/factories/role.factory';
import {
  CreateUserInput,
  RoleCredentials,
  UserCredentials,
  UserRecord,
} from '../../ports/access.gateway';
import { IdentityAccessGatewayMock } from 'src/modules/auth/testing/mocks/identity-access-gateway.mock';
import { IdentityAccessGatewayCommandTestFactory } from 'src/modules/auth/testing/factories/indentity-gateway-dto.factory';
import { RegisterCommandTestFactory } from 'src/modules/auth/testing/factories/register-dto.factory';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';

describe('RegisterUserUseCase', () => {
  let usecase: RegisterUserUseCase;
  let identityAccessGatewayMock: IdentityAccessGatewayMock;
  let passwordHasher: MockPasswordHasher;
  let mockUserRecord: UserRecord;
  let mockCreateUserInput: CreateUserInput;
  let mockRoleCredentialsCommand: RoleCredentials;
  let mockUserCredentialsCommand: UserCredentials;
  let mockRegisterCommand: RegisterCommand;
  beforeEach(() => {
    identityAccessGatewayMock = new IdentityAccessGatewayMock();

    passwordHasher = new MockPasswordHasher();
    usecase = new RegisterUserUseCase(
      passwordHasher,
      identityAccessGatewayMock,
    );
    mockUserRecord = IdentityAccessGatewayCommandTestFactory.createUserRecord();
    mockCreateUserInput =
      IdentityAccessGatewayCommandTestFactory.createUserInputCommand();
    mockRoleCredentialsCommand =
      IdentityAccessGatewayCommandTestFactory.createRoleCredentialsCommand();
    mockUserCredentialsCommand =
      IdentityAccessGatewayCommandTestFactory.createUserCredentialsCommand();
    mockRegisterCommand = RegisterCommandTestFactory.createRegisterCommand();

    const customerRole = RoleTestFactory.buildEntity({ code: 'CUSTOMER' });
    identityAccessGatewayMock.mockSuccessfulFindRoleById({
      id: 2,
      code: 'CUSTOMER',
    });
  });

  afterEach(() => {
    identityAccessGatewayMock.reset();
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
