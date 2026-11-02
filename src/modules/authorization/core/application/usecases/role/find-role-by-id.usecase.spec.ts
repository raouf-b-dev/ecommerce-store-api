import {
  MockRoleRepository,
  AuthorizationDtoFactory,
} from 'src/modules/authorization/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { FindRoleByIdUseCase } from './find-role-by-id.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';

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
    const role = AuthorizationDtoFactory.buildEntity();

    mockRoleRepo.findById.mockResolvedValue(Result.success(role));

    // Act
    const result = await useCase.execute(1);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(role.toPrimitives());
  });

  it('should return ROLE_NOT_FOUND when repository reports not found', async () => {
    mockRoleRepo.findById.mockResolvedValue(
      ErrorFactory.RepositoryError('Role not found', {
        kind: ErrorKind.NOT_FOUND,
      }),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(result, 'Role not found');
    expect(result.error.code).toBe(ErrorCode.ROLE_NOT_FOUND);
    expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
  });

  it('should return failure if repository find fails', async () => {
    mockRoleRepo.findById.mockResolvedValue(
      ErrorFactory.RepositoryError('DB Error'),
    );

    const result = await useCase.execute(1);

    ResultAssertionHelper.assertResultFailure(result, 'Failed to find role');
  });
});
