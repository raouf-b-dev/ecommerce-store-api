import { Test, TestingModule } from '@nestjs/testing';
import { UpdateRoleUseCase } from './update-role.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;
  let mockRoleRepo: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepo = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateRoleUseCase,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
      ],
    }).compile();

    useCase = module.get<UpdateRoleUseCase>(UpdateRoleUseCase);
  });

  it('should successfully update a role', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();

    mockRoleRepo.findById.mockResolvedValue(Result.success(role));
    mockRoleRepo.update.mockResolvedValue(Result.success(undefined as any));

    // Act
    const result = await useCase.execute({
      id: 1,
      name: 'Updated Manager',
      permissions: ['manage_products', 'manage_users'],
    });

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRoleRepo.update).toHaveBeenCalled();
    const updatedRole = mockRoleRepo.update.mock.calls[0][0];
    expect(updatedRole.name).toBe('Updated Manager');
    expect(updatedRole.permissions.has('manage_users')).toBe(true);
  });

  it('should return failure if role not found', async () => {
    // Arrange
    mockRoleRepo.findById.mockResolvedValue(Result.success(null) as any);

    // Act
    const result = await useCase.execute({
      id: 1,
      name: 'Updated Manager',
      permissions: ['manage_products', 'manage_users'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(result);
    expect(mockRoleRepo.update).not.toHaveBeenCalled();
  });

  it('should return failure if updating name of a system role', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity({ isSystem: true });
    mockRoleRepo.findById.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute({
      id: 1,
      name: 'Updated System Role',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(result, 'Failed to update name');
    expect(mockRoleRepo.update).not.toHaveBeenCalled();
  });

  it('should return failure if updating role in repository fails', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();
    mockRoleRepo.findById.mockResolvedValue(Result.success(role));
    mockRoleRepo.update.mockResolvedValue(
      Result.failure(new Error('DB Error') as any),
    );

    // Act
    const result = await useCase.execute({
      id: 1,
      name: 'Updated Manager',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(result, 'Failed to update role');
  });
});
