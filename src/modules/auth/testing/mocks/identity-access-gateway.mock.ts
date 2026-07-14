import {
  IdentityAccessGateway,
  UserCredentials,
  RoleCredentials,
  CreateUserInput,
  UserRecord,
} from '../../core/application/ports/access.gateway';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';

export class IdentityAccessGatewayMock implements IdentityAccessGateway {
  checkEmailExists = jest.fn<
    Promise<Result<boolean, InfrastructureError>>,
    [string]
  >();
  createUser = jest.fn<
    Promise<Result<UserRecord, InfrastructureError>>,
    [CreateUserInput]
  >();
  findCredentialsByEmail = jest.fn<
    Promise<Result<UserCredentials | null, InfrastructureError>>,
    [string]
  >();
  findCredentialsById = jest.fn<
    Promise<Result<UserCredentials | null, InfrastructureError>>,
    [number]
  >();
  findRoleById = jest.fn<
    Promise<Result<RoleCredentials | null, InfrastructureError>>,
    [number]
  >();

  mockSuccessfulFindByEmail(credentials: UserCredentials): void {
    this.findCredentialsByEmail.mockResolvedValue(Result.success(credentials));
  }

  mockUserNotFoundByEmail(): void {
    this.findCredentialsByEmail.mockResolvedValue(Result.success(null));
  }

  mockSuccessfulFindById(credentials: UserCredentials): void {
    this.findCredentialsById.mockResolvedValue(Result.success(credentials));
  }

  mockUserNotFoundById(): void {
    this.findCredentialsById.mockResolvedValue(Result.success(null));
  }

  mockSuccessfulFindRoleById(role: RoleCredentials): void {
    this.findRoleById.mockResolvedValue(Result.success(role));
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
