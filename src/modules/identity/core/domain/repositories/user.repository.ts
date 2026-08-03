import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { User } from '../entities/user';

export abstract class UserRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: User; expectedVersion: number } | null, RepositoryError>
  >;
  abstract save(
    user: User,
    expectedVersion?: number,
  ): Promise<Result<User, RepositoryError>>;
  abstract findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>>;
  abstract findById(id: number): Promise<Result<User | null, RepositoryError>>;
  abstract findAll(
    page?: number,
    limit?: number,
  ): Promise<Result<User[], RepositoryError>>;
  abstract existsByEmail(
    email: string,
  ): Promise<Result<boolean, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
