import { Test, TestingModule } from '@nestjs/testing';
import { FindAllPermissionsUseCase } from './find-all-permissions.usecase';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { ResultAssertionHelper } from '../../../../../testing';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Permission } from '../../domain/entities/permission';
import { MockPermissionRepository } from '../../../testing/mocks/permission-repository.mock';

describe('FindAllPermissionsUseCase', () => {
  let useCase: FindAllPermissionsUseCase;
  let mockPermissionRepo: MockPermissionRepository;

  beforeEach(async () => {
    mockPermissionRepo = new MockPermissionRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllPermissionsUseCase,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepo,
        },
      ],
    }).compile();

    useCase = module.get<FindAllPermissionsUseCase>(FindAllPermissionsUseCase);
  });

  it('should return all permissions mapped to primitives', async () => {
    const permission = new Permission({
      id: 1,
      code: 'manage_users',
      description: 'Manage users',
    });

    mockPermissionRepo.findAll.mockResolvedValue(Result.success([permission]));

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([
      { id: 1, code: 'manage_users', description: 'Manage users' },
    ]);
  });

  it('should return an error if repository fails', async () => {
    mockPermissionRepo.findAll.mockResolvedValue(
      Result.failure(new Error('DB Error') as any),
    );

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultFailure(result);
  });
});
