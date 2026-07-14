import { UserRepository } from '../../core/domain/repositories/user.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { User } from '../../core/domain/entities/user';
import { UserTestFactory } from '../factories/user.factory';

export class MockUserRepository implements UserRepository {
  existsByEmail = jest.fn<
    Promise<Result<boolean, RepositoryError>>,
    [string]
  >();
  findAll = jest.fn<
    Promise<Result<User[], RepositoryError>>,
    [number, number]
  >();
  update = jest.fn<Promise<Result<void, RepositoryError>>, [User]>();
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

  mockSuccessfulUpdate(): void {
    this.update.mockResolvedValue(Result.success(undefined));
  }

  mockUpdateFailure(errorMessage: string): void {
    this.update.mockResolvedValue(
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

  mockSuccessfulExistsByEmail(): void {
    this.existsByEmail.mockResolvedValue(Result.success(true));
  }

  mockFailedExistsByEmail(): void {
    this.existsByEmail.mockResolvedValue(Result.success(false));
  }

  mockSuccessfulFindAll(): void {
    const users = [User.fromProps(UserTestFactory.createMockUser())];
    this.findAll.mockResolvedValue(Result.success(users));
  }

  mockFindAllFailure(errorMessage: string): void {
    this.findAll.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindById(id: number): void {
    const user = User.fromProps(UserTestFactory.createMockUser());
    this.findById.mockResolvedValue(Result.success(user || null));
  }

  mockFindByIdFailure(errorMessage: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindByEmail(userData: any): void {
    const user = User.fromProps(userData);
    this.findByEmail.mockResolvedValue(Result.success(user));
  }

  mockEmailNotFound(): void {
    this.findByEmail.mockResolvedValue(Result.success(null));
  }

  mockFindByEmailFailure(errorMessage: string): void {
    this.findByEmail.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFind(userData: any): void {
    const user = User.fromProps(userData);
    this.findById.mockResolvedValue(Result.success(user));
  }

  mockCustomerNotFound(): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError('User not found')),
    );
  }

  /** Alias used in some legacy specs */
  mockUser(): void {
    this.findById.mockResolvedValue(Result.success(null));
  }

  /** Alias used in some legacy specs */
  mockCustomekUser(): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError('User not found')),
    );
  }

  /** Alias used in some legacy specs */
  mockMockCustomer(userData: any): void {
    this.mockSuccessfulFind(userData);
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByEmail).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.existsByEmail).not.toHaveBeenCalled();
  }
}
