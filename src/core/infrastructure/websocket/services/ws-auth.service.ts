import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { EnvConfigService } from 'src/config/env-config.service';

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: EnvConfigService,
  ) {}

  async authenticate(client: Socket): Promise<any> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Connection attempt without token from ${client.id}`);
      throw new Error('Missing token');
    }

    try {
      const secret = this.configService.jwt.secret;
      const payload = await this.jwtService.verifyAsync(token, { secret });
      return payload;
    } catch (err) {
      this.logger.warn(`Invalid token from ${client.id}: ${err.message}`);
      throw new Error('Invalid token');
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
