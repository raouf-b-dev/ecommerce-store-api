import { SessionTokenRepository } from '../../core/domain/repositories/session-token.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { SessionToken } from '../../core/domain/entities/session-token';

export class MockSessionTokenRepository implements SessionTokenRepository {
  save = jest.fn<
    Promise<Result<SessionToken, RepositoryError>>,
    [SessionToken]
  >();
  findById = jest.fn<
    Promise<Result<SessionToken | null, RepositoryError>>,
    [string]
  >();
  revokeAllForUser = jest.fn<
    Promise<Result<void, RepositoryError>>,
    [number]
  >();
  deleteExpired = jest.fn<Promise<Result<number, RepositoryError>>, []>();

  mockSuccessfulSave(session: SessionToken): void {
    this.save.mockResolvedValue(Result.success(session));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
