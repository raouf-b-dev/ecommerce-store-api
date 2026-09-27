import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import {
  CreateUserInput,
  IdentityGateway,
  UserRecord,
} from '../../core/application/ports/identity.gateway';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export class IdentityAccessGatewayMock implements IdentityGateway {
  checkEmailExists = jest.fn<
    Promise<Result<boolean, InfrastructureError>>,
    [string]
  >();
  createUser = jest.fn<
    Promise<Result<UserRecord, InfrastructureError>>,
    [CreateUserInput]
  >();
  findUserByEmail = jest.fn<
    Promise<Result<UserRecord | null, InfrastructureError>>,
    [string]
  >();
  findUserById = jest.fn<
    Promise<Result<UserRecord | null, InfrastructureError>>,
    [number]
  >();

  deleteUser = jest.fn<Promise<Result<void, InfrastructureError>>, [number]>();
  // mock check email exists
  mockCheckEmailExists(exists: boolean): void {
    this.checkEmailExists.mockResolvedValue(Result.success(exists));
  }

  mockCheckEmailExistsError(errorMessage: string): void {
    this.checkEmailExists.mockResolvedValue(
      ErrorFactory.InfrastructureError(errorMessage),
    );
  }

  // mock create user
  mockCreateUser(userRecord: UserRecord): void {
    this.createUser.mockResolvedValue(Result.success(userRecord));
  }

  mockCreateUserError(errorMessage: string): void {
    this.createUser.mockResolvedValue(
      ErrorFactory.InfrastructureError(errorMessage),
    );
  }

  // mock find user by email
  mockFindUserByEmail(userRecord: UserRecord | null): void {
    this.findUserByEmail.mockResolvedValue(Result.success(userRecord));
  }

  mockFindUserByEmailError(errorMessage: string): void {
    this.findUserByEmail.mockResolvedValue(
      ErrorFactory.InfrastructureError(errorMessage),
    );
  }

  // mock find user by id
  mockFindUserById(userRecord: UserRecord | null): void {
    this.findUserById.mockResolvedValue(Result.success(userRecord));
  }

  mockFindUserByIdError(errorMessage: string): void {
    this.findUserById.mockResolvedValue(
      ErrorFactory.InfrastructureError(errorMessage),
    );
  }

  // mock delete user
  mockDeleteUser(): void {
    this.deleteUser.mockResolvedValue(Result.success(undefined));
  }

  mockFailedDeleteUser(errorMessage: string): void {
    this.deleteUser.mockResolvedValue(
      ErrorFactory.InfrastructureError(errorMessage),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.checkEmailExists).not.toHaveBeenCalled();
    expect(this.createUser).not.toHaveBeenCalled();
    expect(this.findUserByEmail).not.toHaveBeenCalled();
    expect(this.findUserById).not.toHaveBeenCalled();
    expect(this.deleteUser).not.toHaveBeenCalled();
  }
}
