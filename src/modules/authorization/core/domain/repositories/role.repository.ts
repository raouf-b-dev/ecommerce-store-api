import { Result } from '../../../../../shared-kernel/domain/result';
import { Role } from '../entities/role';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';

export abstract class RoleRepository {
  abstract findById(id: number): Promise<Result<Role, RepositoryError>>;
  abstract findByCode(
    code: string,
  ): Promise<Result<Role | null, RepositoryError>>;
  abstract findAll(): Promise<Result<Role[], RepositoryError>>;
  abstract save(role: Role): Promise<Result<Role, RepositoryError>>;
  abstract saveMany(roles: Role[]): Promise<Result<Role[], RepositoryError>>;
  abstract update(role: Role): Promise<Result<void, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;

  /** Lean query — returns only permission codes for a role, without hydrating the full aggregate */
  abstract findPermissionCodesByRoleCode(
    roleCode: string,
  ): Promise<Result<string[] | null, RepositoryError>>;
}
