import { RoleRepository } from '../../core/domain/repositories/role.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { Role } from '../../core/domain/entities/role';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';

export class MockRoleRepository implements RoleRepository {
  public findById = jest.fn<Promise<Result<Role, RepositoryError>>, [number]>();
  public findByCode = jest.fn<
    Promise<Result<Role | null, RepositoryError>>,
    [string]
  >();
  public findAll = jest.fn<Promise<Result<Role[], RepositoryError>>, []>();
  public save = jest.fn<Promise<Result<Role, RepositoryError>>, [Role]>();
  public saveMany = jest.fn<
    Promise<Result<Role[], RepositoryError>>,
    [Role[]]
  >();
  public update = jest.fn<Promise<Result<void, RepositoryError>>, [Role]>();
  public delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();
  public findPermissionCodesByRoleCode = jest.fn();

  constructor() {
    this.findById.mockResolvedValue(Result.success({} as Role));
    this.findByCode.mockResolvedValue(Result.success(null));
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByCode).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
    expect(this.findPermissionCodesByRoleCode).not.toHaveBeenCalled();
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
