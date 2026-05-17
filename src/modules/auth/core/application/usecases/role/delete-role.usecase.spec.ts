import { Test, TestingModule } from '@nestjs/testing';
import { DeleteRoleUseCase } from './delete-role.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;
  let mockRoleRepo: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepo = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteRoleUseCase,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
      ],
    }).compile();

    useCase = module.get<DeleteRoleUseCase>(DeleteRoleUseCase);
  });

  it('should successfully delete a role', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();

    mockRoleRepo.findById.mockResolvedValue(Result.success(role));
    mockRoleRepo.delete.mockResolvedValue(Result.success<void>(undefined));

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRoleRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should prevent deletion of system roles', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity({ isSystem: true, code: 'ADMIN' });

    mockRoleRepo.findById.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultFailure(result);
    expect(mockRoleRepo.delete).not.toHaveBeenCalled();
  });

  it('should return failure if role not found', async () => {
    // Arrange
    mockRoleRepo.findById.mockResolvedValue(
      ErrorFactory.RepositoryError('Role not found'),
    );

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultFailure(result, 'Role not found');
    expect(mockRoleRepo.delete).not.toHaveBeenCalled();
  });

  it('should return failure if deleting role fails in repository', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();
    mockRoleRepo.findById.mockResolvedValue(Result.success(role));
    mockRoleRepo.delete.mockResolvedValue(
      ErrorFactory.RepositoryError('DB Error'),
    );

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultFailure(result, 'Failed to delete role');
  });
});
