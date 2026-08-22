import { UserRepository } from '../../core/domain/repositories/user.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { User } from '../../core/domain/entities/user';
import { IUser } from '../../core/domain/interfaces/user.interface';
import { UserTestFactory } from '../factories/user.factory';

export class MockUserRepository implements UserRepository {
  findByIdForUpdate = jest.fn<
    Promise<
      Result<{ entity: User; expectedVersion: number } | null, RepositoryError>
    >,
    [number]
  >();
  existsByEmail = jest.fn<
    Promise<Result<boolean, RepositoryError>>,
    [string]
  >();
  findAll = jest.fn<
    Promise<Result<User[], RepositoryError>>,
    [number, number]
  >();
  save = jest.fn<Promise<Result<User, RepositoryError>>, [User, number?]>();
  findByEmail = jest.fn<
    Promise<Result<User | null, RepositoryError>>,
    [string]
  >();
  findById = jest.fn<Promise<Result<User | null, RepositoryError>>, [number]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulSave(user?: User): void {
    if (user) {
      this.save.mockResolvedValue(Result.success(user));
    } else {
      this.save.mockImplementation((u: User) =>
        Promise.resolve(Result.success(u)),
      );
    }
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindByIdForUpdate(
    overrides?: Partial<IUser>,
    expectedVersion = 1,
  ): void {
    const user = User.fromProps(UserTestFactory.createUserProps(overrides));
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: user, expectedVersion }),
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
    const users = [User.fromProps(UserTestFactory.createUserProps())];
    this.findAll.mockResolvedValue(Result.success(users));
  }

  mockFindAllFailure(errorMessage: string): void {
    this.findAll.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindById(id: number): void {
    const user = User.fromProps(UserTestFactory.createUserProps({ id }));
    this.findById.mockResolvedValue(Result.success(user));
  }

  mockFindByIdFailure(errorMessage: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindByEmail(overrides?: Partial<IUser>): void {
    const user = User.fromProps(UserTestFactory.createUserProps(overrides));
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

  mockSuccessfulFind(overrides?: Partial<IUser>): void {
    const user = User.fromProps(UserTestFactory.createUserProps(overrides));
    this.findById.mockResolvedValue(Result.success(user));
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: user, expectedVersion: 1 }),
    );
  }

  mockUserNotFound(): void {
    this.findById.mockResolvedValue(Result.success(null));
    this.findByIdForUpdate.mockResolvedValue(Result.success(null));
  }

  /** Alias used in some legacy specs */
  mockUser(): void {
    this.findById.mockResolvedValue(Result.success(null));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByEmail).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.existsByEmail).not.toHaveBeenCalled();
  }
}
