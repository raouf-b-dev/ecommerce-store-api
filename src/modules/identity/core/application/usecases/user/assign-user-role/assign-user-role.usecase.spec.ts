import { HttpStatus } from '@nestjs/common';
import { AssignUserRoleUseCase } from './assign-user-role.usecase';
import {
  AuthorizationGatewayMock,
  MockUserRepository,
  UserTestFactory,
} from 'src/modules/identity/testing';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('AssignUserRoleUseCase', () => {
  let usecase: AssignUserRoleUseCase;
  let userRepository: MockUserRepository;
  let authorizationGateway: AuthorizationGatewayMock;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    authorizationGateway = new AuthorizationGatewayMock();
    usecase = new AssignUserRoleUseCase(userRepository, authorizationGateway);
  });

  afterEach(() => {
    userRepository.reset();
    authorizationGateway.reset();
  });

  it('should assign role when user exists', async () => {
    const userId = 1;
    userRepository.mockSuccessfulFindById(userId);
    authorizationGateway.mockSuccessfulAssignRole();

    const command = UserTestFactory.createAssignUserRoleCommand({
      userId,
      roleCode: 'ADMIN',
    });
    const result = await usecase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      userId,
      'ADMIN',
    );
  });

  it('should return 404 when user not found', async () => {
    userRepository.mockUserNotFound();

    const command = UserTestFactory.createAssignUserRoleCommand({
      userId: 999,
      roleCode: 'ADMIN',
    });
    const result = await usecase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
    if (result.isFailure)
      expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
    authorizationGateway.verifyNoUnexpectedCalls();
  });

  it('should propagate gateway failure when role not found', async () => {
    const userId = 1;
    userRepository.mockSuccessfulFindById(userId);
    authorizationGateway.mockFailedAssignRole(
      'Role INVALID not found',
      HttpStatus.NOT_FOUND,
    );

    const command = UserTestFactory.createAssignUserRoleCommand({
      userId,
      roleCode: 'INVALID',
    });
    const result = await usecase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Role INVALID not found',
      UseCaseError,
    );
    if (result.isFailure)
      expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });
});
