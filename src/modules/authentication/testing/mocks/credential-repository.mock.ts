import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';
import { Result } from 'src/shared-kernel/domain/result';
import { Credential } from '../../core/domain/entities/credential';
import { CredentialRepository } from '../../core/domain/repositories/credential.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export class CredentialRepositoryMock extends CredentialRepository {
  save = jest.fn<Promise<Result<Credential, RepositoryError>>, [Credential]>();
  findByUserId = jest.fn<
    Promise<Result<Credential | null, RepositoryError>>,
    [number]
  >();
  update = jest.fn<Promise<Result<void, RepositoryError>>, [Credential]>();
  deleteByUserId = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulSave(credential: Credential) {
    this.save.mockResolvedValue(Result.success(credential));
  }

  mockFailedSave(message: string) {
    this.save.mockResolvedValue(ErrorFactory.RepositoryError(message));
  }

  mockSuccessfulFindByUserId(credential: Credential | null) {
    this.findByUserId.mockResolvedValue(Result.success(credential));
  }

  mockFailedFindByUserId(message: string) {
    this.findByUserId.mockResolvedValue(ErrorFactory.RepositoryError(message));
  }

  mockSuccessfulUpdate() {
    this.update.mockResolvedValue(Result.success(undefined));
  }

  mockFailedUpdate(message: string) {
    this.update.mockResolvedValue(ErrorFactory.RepositoryError(message));
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
    this.update.mockClear();
    this.deleteByUserId.mockClear();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.findByUserId).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.deleteByUserId).not.toHaveBeenCalled();
  }
}
