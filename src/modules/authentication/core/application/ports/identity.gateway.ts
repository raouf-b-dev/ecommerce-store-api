import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface UserRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
}

export abstract class IdentityGateway {
  abstract checkEmailExists(
    email: string,
  ): Promise<Result<boolean, InfrastructureError>>;
  abstract createUser(
    input: CreateUserInput,
  ): Promise<Result<UserRecord, InfrastructureError>>;
  abstract findUserByEmail(
    email: string,
  ): Promise<Result<UserRecord | null, InfrastructureError>>;
  abstract findUserById(
    id: number,
  ): Promise<Result<UserRecord | null, InfrastructureError>>;
  abstract deleteUser(id: number): Promise<Result<void, InfrastructureError>>;
}
