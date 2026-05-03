import { Test, TestingModule } from '@nestjs/testing';
import { FindAllRolesUseCase } from './find-all-roles.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';

describe('FindAllRolesUseCase', () => {
  let useCase: FindAllRolesUseCase;
  let mockRoleRepo: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepo = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllRolesUseCase,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
      ],
    }).compile();

    useCase = module.get<FindAllRolesUseCase>(FindAllRolesUseCase);
  });

  it('should successfully return all roles as primitives', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();

    mockRoleRepo.findAll.mockResolvedValue(Result.success([role]));

    // Act
    const result = await useCase.execute();

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([role.toPrimitives()]);
  });

  it('should return failure if repository fails', async () => {
    // Arrange
    mockRoleRepo.findAll.mockResolvedValue(
      Result.failure(new Error('DB Error') as any),
    );

    // Act
    const result = await useCase.execute();

    // Assert
    ResultAssertionHelper.assertResultFailure(result, 'Failed to load roles');
  });
});
