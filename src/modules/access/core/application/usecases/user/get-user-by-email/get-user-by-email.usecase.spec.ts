import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from 'src/modules/access/testing/mocks/user-repository.mock';
import { UserTestFactory } from 'src/modules/access/testing/factories/user.factory';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { HttpStatus } from '@nestjs/common';

describe('GetUserByEmailUseCase', () => {
  let useCase: GetUserByEmailUseCase;
  let mockUserRepository: MockUserRepository;

  const validEmail = 'test@example.com';

  const ownUserContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const otherUserContext = createUserCallerContext({
    userId: 3,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const adminContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_customers']),
  });

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new GetUserByEmailUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with user if found and caller is system context', async () => {
      const mockUserData = UserTestFactory.createMockUser({
        id: 123,
        email: validEmail,
      });

      mockUserRepository.mockSuccessfulFindByEmail(mockUserData);

      const result = await useCase.execute({
        email: validEmail,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.email).toBe(validEmail);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });

    it('should return Success with user if found and caller is admin context', async () => {
      const mockUserData = UserTestFactory.createMockUser({
        id: 123,
        email: validEmail,
      });

      mockUserRepository.mockSuccessfulFindByEmail(mockUserData);

      const result = await useCase.execute({
        email: validEmail,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.email).toBe(validEmail);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });

    it('should return Success with user if found and caller is own user context', async () => {
      const mockUserData = UserTestFactory.createMockUser({
        id: ownUserContext.userId,
        email: validEmail,
      });

      mockUserRepository.mockSuccessfulFindByEmail(mockUserData);

      const result = await useCase.execute({
        email: validEmail,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.email).toBe(validEmail);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });

    it('should return Failure(FORBIDDEN) if caller is not the owner or admin/system', async () => {
      const mockUserData = UserTestFactory.createMockUser({
        id: 123, // owner ID is 123, caller is otherUserContext (userId: 3)
        email: validEmail,
      });

      mockUserRepository.mockSuccessfulFindByEmail(mockUserData);

      const result = await useCase.execute({
        email: validEmail,
        callerContext: otherUserContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Access denied: You do not have permission to view this profile',
        UseCaseError,
      );
      if (result.isFailure)
        expect(result.error.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });

    it('should return Failure(NOT_FOUND) if user not found by email', async () => {
      mockUserRepository.mockEmailNotFound();

      const result = await useCase.execute({
        email: validEmail,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `User with email ${validEmail} not found`,
        UseCaseError,
      );
      if (result.isFailure)
        expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });

    it('should return Failure(RepositoryError) if database lookup fails', async () => {
      mockUserRepository.mockFindByEmailFailure('Database connection error');

      const result = await useCase.execute({
        email: validEmail,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection error',
        RepositoryError,
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validEmail);
    });
  });
});
