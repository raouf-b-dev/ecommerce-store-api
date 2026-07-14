import { Test, TestingModule } from '@nestjs/testing';
import { CreateRoleUseCase } from './create-role.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let mockRoleRepo: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepo = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRoleUseCase,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
      ],
    }).compile();

    useCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
  });

  it('should successfully create a role', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null));
    mockRoleRepo.save.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute({
      code: 'MANAGER',
      name: 'Manager',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRoleRepo.save).toHaveBeenCalled();
    expect(result.value).toEqual(role.toPrimitives());
  });

  it('should return failure if repository fails', async () => {
    // Arrange
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null));
    mockRoleRepo.save.mockResolvedValue(
      ErrorFactory.RepositoryError('DB Error'),
    );

    // Act
    const result = await useCase.execute({
      code: 'MANAGER',
      name: 'Manager',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(result);
    expect(mockRoleRepo.save).toHaveBeenCalled();
  });

  it('should return failure if role code already exists', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute({
      code: 'MANAGER',
      name: 'Manager',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Role with code MANAGER already exists',
    );
    expect(mockRoleRepo.save).not.toHaveBeenCalled();
  });

  it('should return failure if findByCode fails', async () => {
    // Arrange
    mockRoleRepo.findByCode.mockResolvedValue(
      ErrorFactory.RepositoryError('DB Error'),
    );

    // Act
    const result = await useCase.execute({
      code: 'MANAGER',
      name: 'Manager',
      permissions: ['manage_products'],
    });

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to validate role code uniqueness',
    );
    expect(mockRoleRepo.save).not.toHaveBeenCalled();
  });
});
