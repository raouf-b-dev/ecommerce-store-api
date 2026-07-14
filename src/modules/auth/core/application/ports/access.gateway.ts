import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mustChangePassword: boolean;
  passwordHash: string;
}

export interface UserCredentials {
  id: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
  roleId: number;
}
export interface RoleCredentials {
  id: number;
  code: string;
}

export interface UserRecord {
  id: number | null;
}

export abstract class IdentityAccessGateway {
  abstract checkEmailExists(
    email: string,
  ): Promise<Result<boolean, InfrastructureError>>;
  abstract createUser(
    input: CreateUserInput,
  ): Promise<Result<UserRecord, InfrastructureError>>;
  abstract findCredentialsByEmail(
    email: string,
  ): Promise<Result<UserCredentials | null, InfrastructureError>>;
  abstract findCredentialsById(
    id: number,
  ): Promise<Result<UserCredentials | null, InfrastructureError>>;

  abstract findRoleById(
    id: number,
  ): Promise<Result<RoleCredentials | null, InfrastructureError>>;
}
