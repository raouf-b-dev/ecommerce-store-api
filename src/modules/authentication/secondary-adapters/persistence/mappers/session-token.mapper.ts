import {
  SessionToken,
  SessionTokenProps,
} from '../../../core/domain/entities/session-token';
import { SessionTokenEntity } from '../../orm/session-token.schema';
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';

type SessionTokenCreate = CreateFromEntity<SessionTokenEntity>;

export class SessionTokenMapper {
  static toDomain(entity: SessionTokenEntity): SessionToken {
    const props: SessionTokenProps = {
      id: entity.id,
      userId: entity.userId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      isRevoked: entity.isRevoked,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
    };
    return SessionToken.fromPrimitives(props);
  }

  static toEntity(domain: SessionToken): SessionTokenEntity {
    const primitives = domain.toPrimitives();

    const entityPayload: SessionTokenCreate = {
      id: primitives.id,
      userId: primitives.userId,
      tokenHash: primitives.tokenHash,
      expiresAt: primitives.expiresAt,
      isRevoked: primitives.isRevoked,
      revokedAt: primitives.revokedAt,
      createdAt: primitives.createdAt,
    };
    const entity = Object.assign(new SessionTokenEntity(), entityPayload);
    return entity;
  }
}
