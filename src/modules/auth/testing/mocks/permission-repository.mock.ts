import { PermissionRepository } from '../../core/domain/repositories/permission.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { Permission } from '../../core/domain/entities/permission';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';

export class MockPermissionRepository implements PermissionRepository {
  public findByCode = jest.fn<
    Promise<Result<Permission | null, RepositoryError>>,
    [string]
  >();
  public findAll = jest.fn<
    Promise<Result<Permission[], RepositoryError>>,
    []
  >();
  public saveMany = jest.fn<
    Promise<Result<Permission[], RepositoryError>>,
    [Permission[]]
  >();

  constructor() {
    this.findByCode.mockResolvedValue(Result.success(null));
    this.findAll.mockResolvedValue(Result.success([]));
    this.saveMany.mockResolvedValue(Result.success([]));
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findByCode).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.saveMany).not.toHaveBeenCalled();
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
