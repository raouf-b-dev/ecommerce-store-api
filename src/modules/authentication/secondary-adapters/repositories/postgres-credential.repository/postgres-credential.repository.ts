import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CredentialEntity } from '../../orm/credential.schema';
import { CredentialRepository } from '../../../core/domain/repositories/credential.repository';
import { Credential } from '../../../core/domain/entities/credential';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresCredentialRepository implements CredentialRepository {
  constructor(
    @InjectRepository(CredentialEntity)
    private readonly repo: Repository<CredentialEntity>,
  ) {}

  async save(
    credential: Credential,
  ): Promise<Result<Credential, RepositoryError>> {
    try {
      const saved = await this.repo.save(
        this.repo.create({
          userId: credential.userId,
          passwordHash: credential.passwordHash,
          mustChangePassword: credential.mustChangePassword,
        }),
      );
      return Result.success(Credential.fromPersistence(saved));
    } catch (err) {
      return ErrorFactory.RepositoryError('Failed to save credential', err);
    }
  }

  async findByUserId(
    userId: number,
  ): Promise<Result<Credential | null, RepositoryError>> {
    try {
      const row = await this.repo.findOne({ where: { userId } });
      return Result.success(row ? Credential.fromPersistence(row) : null);
    } catch (err) {
      return ErrorFactory.RepositoryError('Failed to find credential', err);
    }
  }

  async update(credential: Credential): Promise<Result<void, RepositoryError>> {
    try {
      await this.repo.update(
        { userId: credential.userId },
        {
          passwordHash: credential.passwordHash,
          mustChangePassword: credential.mustChangePassword,
        },
      );
      return Result.success(undefined);
    } catch (err) {
      return ErrorFactory.RepositoryError('Failed to update credential', err);
    }
  }

  async deleteByUserId(userId: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.repo.delete({ userId });
      return Result.success(undefined);
    } catch (err) {
      return ErrorFactory.RepositoryError('Failed to delete credential', err);
    }
  }
}
