import { Test, TestingModule } from '@nestjs/testing';
import { FindRoleByIdUseCase } from './find-role-by-id.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { MockRoleRepository } from '../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../testing/factories/role.factory';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

describe('FindRoleByIdUseCase', () => {
  let useCase: FindRoleByIdUseCase;
  let mockRoleRepo: MockRoleRepository;

  beforeEach(async () => {
    mockRoleRepo = new MockRoleRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindRoleByIdUseCase,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
      ],
    }).compile();

    useCase = module.get<FindRoleByIdUseCase>(FindRoleByIdUseCase);
  });

  it('should successfully return a role by id as primitives', async () => {
    // Arrange
    const role = RoleTestFactory.buildEntity();

    mockRoleRepo.findById.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(role.toPrimitives());
  });

  it('should return failure if role is not found', async () => {
    // Arrange
    mockRoleRepo.findById.mockResolvedValue(
      ErrorFactory.RepositoryError('Role not found'),
    );

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultFailure(result);
  });
});
