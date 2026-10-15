import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';
import { createMockQueryBuilder, ResultAssertionHelper } from 'src/testing';
import { SessionToken } from '../../../core/domain/entities/session-token';
import { SessionTokenEntity } from '../../orm/session-token.schema';
import { SessionTokenMapper } from '../../persistence/mappers/session-token.mapper';
import { PostgresSessionTokenRepository } from './postgres-session-token.repository';

function isJestMock(value: unknown): value is jest.Mock {
  return typeof value === 'function' && 'mock' in value;
}

function mockMethod(builder: object, method: string): jest.Mock {
  if (!(method in builder)) {
    throw new Error(`query builder mock is missing ${method}`);
  }
  const value: unknown = Object.getOwnPropertyDescriptor(
    builder,
    method,
  )?.value;
  if (!isJestMock(value)) {
    throw new Error(`query builder ${method} is not a mock`);
  }
  return value;
}

describe('PostgresSessionTokenRepository', () => {
  const expiresAt = new Date('2099-01-01T00:00:00.000Z');
  const nextExpiry = new Date('2099-06-01T00:00:00.000Z');

  let repository: PostgresSessionTokenRepository;
  let findOneBy: jest.MockedFunction<
    Repository<SessionTokenEntity>['findOneBy']
  >;
  let queryBuilder: ReturnType<
    typeof createMockQueryBuilder<SessionTokenEntity>
  >;

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder<SessionTokenEntity>();
    findOneBy = jest.fn();
    const createQueryBuilder: jest.MockedFunction<
      Repository<SessionTokenEntity>['createQueryBuilder']
    > = jest.fn().mockReturnValue(queryBuilder);

    const module = await Test.createTestingModule({
      providers: [
        PostgresSessionTokenRepository,
        {
          provide: getRepositoryToken(SessionTokenEntity),
          useValue: {
            createQueryBuilder,
            findOneBy,
          },
        },
      ],
    }).compile();

    repository = module.get(PostgresSessionTokenRepository);
  });

  function rotatedSession(): { current: SessionToken; rotated: SessionToken } {
    const current = SessionToken.create(
      1,
      'current-token',
      expiresAt,
      'session-id',
    );
    const rotated = SessionToken.fromPrimitives(current.toPrimitives());
    rotated.rotate('next-token', nextExpiry);
    return { current, rotated };
  }

  it('updates the hash only when the expected hash is still current', async () => {
    const { current, rotated } = rotatedSession();
    queryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
    findOneBy.mockResolvedValue(SessionTokenMapper.toEntity(rotated));

    const result = await repository.replaceTokenIfCurrent(
      rotated,
      current.tokenHash,
    );

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.tokenHash).toBe(rotated.tokenHash);
    expect(result.value.isRevoked).toBe(false);
    expect(queryBuilder.update).toHaveBeenCalledWith(SessionTokenEntity);
    expect(mockMethod(queryBuilder, 'set')).toHaveBeenCalledWith({
      tokenHash: rotated.tokenHash,
      expiresAt: nextExpiry,
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'id = :id AND "tokenHash" = :expectedTokenHash AND "isRevoked" = false AND "expiresAt" > :now',
      expect.objectContaining({
        id: rotated.id,
        expectedTokenHash: current.tokenHash,
        now: expect.any(Date),
      }),
    );
  });

  it('returns conflict when the conditional update affects no rows', async () => {
    const { current, rotated } = rotatedSession();
    queryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });

    const result = await repository.replaceTokenIfCurrent(
      rotated,
      current.tokenHash,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refresh token was already rotated',
      RepositoryError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.CONFLICT);
    expect(result.error.retryable).toBe(false);
    expect(findOneBy).not.toHaveBeenCalled();
  });

  it('returns not found when the updated row cannot be reloaded', async () => {
    const { current, rotated } = rotatedSession();
    queryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
    findOneBy.mockResolvedValue(null);

    const result = await repository.replaceTokenIfCurrent(
      rotated,
      current.tokenHash,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Session not found after rotation',
      RepositoryError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('returns failure when the update throws', async () => {
    const { current, rotated } = rotatedSession();
    queryBuilder.execute.mockRejectedValue(new Error('db down'));

    const result = await repository.replaceTokenIfCurrent(
      rotated,
      current.tokenHash,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to rotate session token',
      RepositoryError,
    );
    expect(result.error.retryable).toBe(true);
  });
});
