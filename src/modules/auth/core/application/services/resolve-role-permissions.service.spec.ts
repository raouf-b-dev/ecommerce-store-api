import { Test, TestingModule } from '@nestjs/testing';
import { ResolveRolePermissionsService } from './resolve-role-permissions.service';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { MockRoleRepository } from '../../../testing/mocks/role-repository.mock';

describe('ResolveRolePermissionsService', () => {
  let service: ResolveRolePermissionsService;
  let mockRoleRepository: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepository = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveRolePermissionsService,
        {
          provide: RoleRepository,
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<ResolveRolePermissionsService>(
      ResolveRolePermissionsService,
    );
  });

  it('should return empty RolePermissionsVO if role code is missing', async () => {
    mockRoleRepository.findPermissionCodesByRoleCode.mockResolvedValue(
      Result.success([]),
    );
    const result = await service.execute(
      undefined as unknown as string, // Intentional negative test for missing input
    );
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.codes).toEqual([]);
    }
  });

  it('should return empty RolePermissionsVO if roleRepository fails', async () => {
    mockRoleRepository.findPermissionCodesByRoleCode.mockResolvedValue(
      ErrorFactory.RepositoryError('DB error'),
    );

    const result = await service.execute('ADMIN');
    expect(result.isFailure).toBe(true);
  });

  it('should return RolePermissionsVO with correct codes', async () => {
    mockRoleRepository.findPermissionCodesByRoleCode.mockResolvedValue(
      Result.success(['manage_products', 'manage_users']),
    );

    const result = await service.execute('ADMIN');
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.has('manage_products')).toBe(true);
      expect(result.value.has('manage_users')).toBe(true);
    }
  });
});
