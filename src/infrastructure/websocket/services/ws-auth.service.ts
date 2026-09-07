import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtVerifierPort } from '../../../shared-kernel/domain/interfaces/jwt-verifier.port';
import { toErrorMessage } from '../../../shared-kernel/infra/lang/error.utils';

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(private readonly jwtVerifierService: JwtVerifierPort) {}

  async authenticate(client: Socket): Promise<any> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Connection attempt without token from ${client.id}`);
      throw new Error('Missing token');
    }

    try {
      const payload = await this.jwtVerifierService.verifyAccessToken(token);
      return payload;
    } catch (err) {
      const errorMsg = toErrorMessage(err);
      this.logger.warn(`Invalid token from ${client.id}: ${errorMsg}`);
      throw new Error('Invalid token', { cause: err });
    }
  }

  /**
   * Prefer Socket.IO handshake `auth.token` (not in the URL). Then Bearer
   * header (Node clients). `query.token` remains a legacy fallback.
   */
  private extractToken(client: Socket): string | undefined {
    const authToken = readStringToken(client.handshake.auth?.token);
    if (authToken) {
      return authToken;
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string') {
      const [scheme, credentials] = authHeader.split(' ');
      if (scheme === 'Bearer' && credentials) {
        return credentials;
      }
    }

    return readStringToken(client.handshake.query.token);
  }
}

function readStringToken(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (
    Array.isArray(value) &&
    typeof value[0] === 'string' &&
    value[0].length > 0
  ) {
    return value[0];
  }
  return undefined;
}
