import { GetUserUseCase } from './get-user.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../../testing';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserQueryService } from '../../../../../testing/mocks/user-query-service.mock';
import { UserDtoTestFactory } from '../../../../../testing/factories/user-dto.factory';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let mockUserQueryService: MockUserQueryService;

  const ownUserContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const otherCustomerContext = createUserCallerContext({
    userId: 3,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const adminContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_users']),
  });

  const sampleUser = UserDtoTestFactory.createUserDetailDTO({ id: 2 });

  beforeEach(() => {
    mockUserQueryService = new MockUserQueryService();
    useCase = new GetUserUseCase(mockUserQueryService);
  });

  afterEach(() => {
    mockUserQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success with user if found and caller owns profile', async () => {
      mockUserQueryService.mockSuccessfulGetById(sampleUser);

      const result = await useCase.execute({
        userId: 2,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(2);
      expect(mockUserQueryService.getById).toHaveBeenCalledWith(2);
    });

    it('should return Failure(UseCaseError) if user is not found', async () => {
      mockUserQueryService.mockSuccessfulGetById(null);

      const result = await useCase.execute({
        userId: 2,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 2 not found',
        UseCaseError,
      );
    });

    it('should deny access if customer attempts to view another user profile', async () => {
      const result = await useCase.execute({
        userId: 2,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 2 not found',
        UseCaseError,
      );
    });

    it('should allow admin to view any user profile', async () => {
      mockUserQueryService.mockSuccessfulGetById(sampleUser);

      const result = await useCase.execute({
        userId: 2,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(2);
    });

    it('should allow system caller to view any user profile', async () => {
      mockUserQueryService.mockSuccessfulGetById(sampleUser);

      const result = await useCase.execute({
        userId: 2,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(2);
    });
  });
});
