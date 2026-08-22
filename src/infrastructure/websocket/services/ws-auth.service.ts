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

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }

    const queryToken = client.handshake.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    return undefined;
  }
}
