import { UserRepository } from '../../domain/repositories/user.repository';
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { User } from '../../domain/entities/user';
import { UserTestFactory } from '../factories/user.factory';

export class MockUserRepository implements UserRepository {
  save = jest.fn<Promise<Result<User, RepositoryError>>, [User]>();
  findByEmail = jest.fn<
    Promise<Result<User | null, RepositoryError>>,
    [string]
  >();
  findById = jest.fn<Promise<Result<User | null, RepositoryError>>, [number]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulSave(user: User): void {
    this.save.mockResolvedValue(Result.success(user));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulDelete(): void {
    this.delete.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.delete.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindById(id: number): void {
    const user = User.fromPrimitives(UserTestFactory.createMockUser());
    this.findById.mockResolvedValue(Result.success(user || null));
  }

  mockFindByIdFailure(errorMessage: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindByEmail(email: string): void {
    const user = User.fromPrimitives(UserTestFactory.createMockUser());
    this.findByEmail.mockResolvedValue(Result.success(user || null));
  }

  mockFindByEmailFailure(errorMessage: string): void {
    this.findByEmail.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByEmail).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }
}
