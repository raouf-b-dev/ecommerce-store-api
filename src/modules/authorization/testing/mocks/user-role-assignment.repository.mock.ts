import { Result } from 'src/shared-kernel/domain/result';
import { UserRoleAssignment } from '../../core/domain/entities/user-role-assignment';
import { UserRoleAssignmentRepository } from '../../core/domain/repositories/user-role-assignment.repository';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export class MockUserRoleAssignmentRepository implements UserRoleAssignmentRepository {
  save = jest.fn<
    Promise<Result<UserRoleAssignment, RepositoryError>>,
    [UserRoleAssignment]
  >();
  findByUserId = jest.fn<
    Promise<Result<UserRoleAssignment | null, RepositoryError>>,
    [number]
  >();
  deleteByUserId = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulSave(assignment: UserRoleAssignment) {
    this.save.mockResolvedValue(Result.success(assignment));
  }

  mockPassthroughSave(): void {
    this.save.mockImplementation((assignment: UserRoleAssignment) =>
      Promise.resolve(Result.success(assignment)),
    );
  }

  mockFailedSave(message: string) {
    this.save.mockResolvedValue(ErrorFactory.RepositoryError(message));
  }

  mockSuccessfulFindByUserId(assignment: UserRoleAssignment | null) {
    this.findByUserId.mockResolvedValue(Result.success(assignment));
  }

  mockFailedFindByUserId(message: string) {
    this.findByUserId.mockResolvedValue(ErrorFactory.RepositoryError(message));
  }

  mockSuccessfulDeleteByUserId() {
    this.deleteByUserId.mockResolvedValue(Result.success(undefined));
  }

  mockFailedDeleteByUserId(message: string) {
    this.deleteByUserId.mockResolvedValue(
      ErrorFactory.RepositoryError(message),
    );
  }

  reset() {
    this.save.mockClear();
    this.findByUserId.mockClear();
    this.deleteByUserId.mockClear();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.findByUserId).not.toHaveBeenCalled();
    expect(this.deleteByUserId).not.toHaveBeenCalled();
  }
}
