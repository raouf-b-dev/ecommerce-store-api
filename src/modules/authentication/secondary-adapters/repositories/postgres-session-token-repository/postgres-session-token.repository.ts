import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { SessionToken } from '../../../core/domain/entities/session-token';
import { SessionTokenRepository } from '../../../core/domain/repositories/session-token.repository';
import { SessionTokenEntity } from '../../orm/session-token.schema';
import { SessionTokenMapper } from '../../persistence/mappers/session-token.mapper';

@Injectable()
export class PostgresSessionTokenRepository implements SessionTokenRepository {
  constructor(
    @InjectRepository(SessionTokenEntity)
    private readonly repository: Repository<SessionTokenEntity>,
  ) {}

  async save(
    session: SessionToken,
  ): Promise<Result<SessionToken, RepositoryError>> {
    try {
      const entity = SessionTokenMapper.toEntity(session);
      const savedEntity = await this.repository.save(entity);
      return Result.success(SessionTokenMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to save session token',
        error,
      );
    }
  }

  async findById(
    id: string,
  ): Promise<Result<SessionToken | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) return Result.success(null);
      return Result.success(SessionTokenMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find session token by id',
        error,
      );
    }
  }

  async revokeAllForUser(
    userId: number,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.repository.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      );
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to revoke all sessions for user',
        error,
      );
    }
  }

  async deleteExpired(): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.repository.delete({
        expiresAt: LessThan(new Date()),
      });
      return Result.success(result.affected || 0);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to delete expired sessions',
        error,
      );
    }
  }
}
